-- ============================================================
-- RIDESHARE PLATFORM — PostgreSQL Schema (no PostGIS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE user_role AS ENUM ('rider', 'driver', 'both');
CREATE TYPE vehicle_type AS ENUM ('bike', 'auto', 'car', 'suv', 'van');
CREATE TYPE ride_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded', 'failed');
CREATE TYPE payment_method AS ENUM ('upi', 'card', 'wallet', 'cash');
CREATE TYPE parcel_status AS ENUM ('pending', 'picked_up', 'delivered', 'failed');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone            VARCHAR(15) UNIQUE NOT NULL,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(255) UNIQUE,
  gender           user_gender NOT NULL DEFAULT 'prefer_not_to_say',
  role             user_role NOT NULL DEFAULT 'rider',
  avatar_url       TEXT,
  date_of_birth    DATE,
  aadhaar_verified verification_status NOT NULL DEFAULT 'unverified',
  pan_verified     verification_status NOT NULL DEFAULT 'unverified',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_banned        BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- USER RATINGS
-- ============================================================

CREATE TABLE user_ratings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_by_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id    UUID NOT NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, rated_by_id)
);

CREATE INDEX idx_ratings_user ON user_ratings(rated_user_id);

CREATE MATERIALIZED VIEW user_avg_ratings AS
  SELECT rated_user_id AS user_id,
         ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating,
         COUNT(*) AS total_ratings
  FROM user_ratings
  GROUP BY rated_user_id;

CREATE UNIQUE INDEX ON user_avg_ratings(user_id);

-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TABLE vehicles (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type               vehicle_type NOT NULL,
  make               VARCHAR(50) NOT NULL,
  model              VARCHAR(50) NOT NULL,
  year               SMALLINT NOT NULL,
  color              VARCHAR(30) NOT NULL,
  plate_number       VARCHAR(20) UNIQUE NOT NULL,
  rc_verified        verification_status NOT NULL DEFAULT 'unverified',
  insurance_verified verification_status NOT NULL DEFAULT 'unverified',
  total_seats        SMALLINT NOT NULL CHECK (total_seats BETWEEN 1 AND 7),
  ac_available       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);

-- ============================================================
-- RIDES
-- ============================================================

CREATE TABLE rides (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id        UUID NOT NULL REFERENCES vehicles(id),
  origin_name       VARCHAR(255) NOT NULL,
  origin_lat        DOUBLE PRECISION NOT NULL,
  origin_lng        DOUBLE PRECISION NOT NULL,
  dest_name         VARCHAR(255) NOT NULL,
  dest_lat          DOUBLE PRECISION NOT NULL,
  dest_lng          DOUBLE PRECISION NOT NULL,
  route_polyline    TEXT NOT NULL,
  route_distance_km DECIMAL(8,2) NOT NULL,
  waypoints         JSONB DEFAULT '[]',
  departure_time    TIMESTAMPTZ NOT NULL,
  estimated_arrival TIMESTAMPTZ,
  total_seats       SMALLINT NOT NULL,
  seats_available   SMALLINT NOT NULL,
  base_fare         DECIMAL(10,2) NOT NULL,
  fare_per_km       DECIMAL(6,2),
  allows_parcels    BOOLEAN NOT NULL DEFAULT FALSE,
  parcel_fare       DECIMAL(10,2),
  women_only        BOOLEAN NOT NULL DEFAULT FALSE,
  ac_ride           BOOLEAN NOT NULL DEFAULT FALSE,
  luggage_allowed   BOOLEAN NOT NULL DEFAULT TRUE,
  pets_allowed      BOOLEAN NOT NULL DEFAULT FALSE,
  smoking_allowed   BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,
  status            ride_status NOT NULL DEFAULT 'scheduled',
  cancelled_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rides_driver    ON rides(driver_id);
CREATE INDEX idx_rides_status    ON rides(status);
CREATE INDEX idx_rides_departure ON rides(departure_time);
CREATE INDEX idx_rides_origin    ON rides(origin_lat, origin_lng);
CREATE INDEX idx_rides_dest      ON rides(dest_lat, dest_lng);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id          UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pickup_name      VARCHAR(255) NOT NULL,
  pickup_lat       DOUBLE PRECISION NOT NULL,
  pickup_lng       DOUBLE PRECISION NOT NULL,
  dropoff_name     VARCHAR(255) NOT NULL,
  dropoff_lat      DOUBLE PRECISION NOT NULL,
  dropoff_lng      DOUBLE PRECISION NOT NULL,
  segment_km       DECIMAL(8,2) NOT NULL,
  seats_booked     SMALLINT NOT NULL DEFAULT 1,
  fare_total       DECIMAL(10,2) NOT NULL,
  platform_fee     DECIMAL(10,2) NOT NULL,
  driver_payout    DECIMAL(10,2) NOT NULL,
  status           booking_status NOT NULL DEFAULT 'pending',
  cancelled_by     UUID REFERENCES users(id),
  cancelled_reason TEXT,
  cancelled_at     TIMESTAMPTZ,
  otp              VARCHAR(6),
  boarded_at       TIMESTAMPTZ,
  dropped_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_ratings ADD CONSTRAINT fk_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id);

CREATE INDEX idx_bookings_ride      ON bookings(ride_id);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX idx_bookings_status    ON bookings(status);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID NOT NULL REFERENCES bookings(id),
  payer_id            UUID NOT NULL REFERENCES users(id),
  payee_id            UUID NOT NULL REFERENCES users(id),
  amount              DECIMAL(10,2) NOT NULL,
  platform_fee        DECIMAL(10,2) NOT NULL,
  driver_payout       DECIMAL(10,2) NOT NULL,
  method              payment_method NOT NULL,
  status              payment_status NOT NULL DEFAULT 'pending',
  razorpay_order_id   VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature  VARCHAR(255),
  razorpay_payout_id  VARCHAR(100),
  held_at             TIMESTAMPTZ,
  released_at         TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  failure_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status  ON payments(status);

-- ============================================================
-- PARCELS
-- ============================================================

CREATE TABLE parcels (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id         UUID NOT NULL REFERENCES rides(id),
  sender_id       UUID NOT NULL REFERENCES users(id),
  receiver_name   VARCHAR(100) NOT NULL,
  receiver_phone  VARCHAR(15) NOT NULL,
  pickup_address  VARCHAR(255) NOT NULL,
  pickup_lat      DOUBLE PRECISION NOT NULL,
  pickup_lng      DOUBLE PRECISION NOT NULL,
  dropoff_address VARCHAR(255) NOT NULL,
  dropoff_lat     DOUBLE PRECISION NOT NULL,
  dropoff_lng     DOUBLE PRECISION NOT NULL,
  weight_kg       DECIMAL(5,2),
  description     TEXT,
  fare            DECIMAL(10,2) NOT NULL,
  platform_fee    DECIMAL(10,2) NOT NULL,
  status          parcel_status NOT NULL DEFAULT 'pending',
  pickup_otp      VARCHAR(6),
  delivery_otp    VARCHAR(6),
  picked_up_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LIVE LOCATION
-- ============================================================

CREATE TABLE ride_locations (
  id          BIGSERIAL PRIMARY KEY,
  ride_id     UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES users(id),
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  speed_kmh   DECIMAL(5,2),
  heading     DECIMAL(5,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ride_locations_ride ON ride_locations(ride_id, recorded_at DESC);

-- ============================================================
-- OTP SESSIONS
-- ============================================================

CREATE TABLE otp_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      VARCHAR(15) NOT NULL,
  otp_hash   VARCHAR(255) NOT NULL,
  attempts   SMALLINT NOT NULL DEFAULT 0,
  verified   BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_sessions(phone, expires_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  body       TEXT NOT NULL,
  type       VARCHAR(50) NOT NULL,
  data       JSONB DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================
-- DRIVER SUBSCRIPTIONS
-- ============================================================

CREATE TABLE driver_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan            VARCHAR(50) NOT NULL DEFAULT 'premium',
  amount          DECIMAL(10,2) NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  razorpay_sub_id VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_driver ON driver_subscriptions(driver_id, is_active);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rides_updated    BEFORE UPDATE ON rides    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AUTO SEAT MANAGEMENT
-- ============================================================

CREATE OR REPLACE FUNCTION handle_booking_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE rides SET seats_available = seats_available - NEW.seats_booked
    WHERE id = NEW.ride_id AND seats_available >= NEW.seats_booked;
    IF NOT FOUND THEN RAISE EXCEPTION 'No seats available'; END IF;
  END IF;
  IF NEW.status IN ('cancelled','rejected') AND OLD.status = 'accepted' THEN
    UPDATE rides SET seats_available = seats_available + NEW.seats_booked
    WHERE id = NEW.ride_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_seats
  AFTER UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION handle_booking_accepted();