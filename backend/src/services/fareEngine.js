const FUEL_COST_PER_KM = {
  bike: 2.5, auto: 3.0, car: 4.5, suv: 6.0, van: 7.0,
};

const VEHICLE_MULTIPLIER = {
  bike: 1.0, auto: 1.1, car: 1.3, suv: 1.6, van: 1.8,
};

const getSurgeMultiplier = () => {
  const hour = new Date().getHours();
  if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 20)) return 1.25;
  if (hour >= 22 || hour < 6) return 0.9;
  return 1.0;
};

exports.calculateFare = ({
  distanceKm, baseFare, farePerKm,
  seats = 1, vehicleType = 'car',
  ac = false, applySurge = true,
}) => {
  const perKm       = farePerKm || FUEL_COST_PER_KM[vehicleType] || 4.5;
  const vehicleMult = VEHICLE_MULTIPLIER[vehicleType] || 1.3;
  const surgeMult   = applySurge ? getSurgeMultiplier() : 1.0;
  const acSurcharge = ac ? 1.1 : 1.0;

  const distanceFare = distanceKm * perKm * vehicleMult;
  const rawTotal     = (baseFare + distanceFare) * surgeMult * acSurcharge;
  const perSeat      = Math.round(rawTotal / 5) * 5;
  const total        = perSeat * seats;
  const platformFee  = Math.round(total * 0.15 * 100) / 100;
  const driverPayout = Math.round((total - platformFee) * 100) / 100;

  return {
    perSeat, total, platformFee, driverPayout,
    surgeApplied: surgeMult > 1,
    surgeMultiplier: surgeMult,
    breakdown: {
      baseFare,
      distanceFare:      Math.round(distanceFare),
      vehicleMultiplier: vehicleMult,
      acSurcharge:       ac ? '10%' : 'none',
      surge:             surgeMult > 1 ? `${Math.round((surgeMult - 1) * 100)}% surge` : 'none',
    },
  };
};

exports.suggestFare = ({ distanceKm, vehicleType = 'car', ac = false }) => {
  const perKm     = FUEL_COST_PER_KM[vehicleType] || 4.5;
  const mult      = VEHICLE_MULTIPLIER[vehicleType] || 1.3;
  const acMult    = ac ? 1.1 : 1.0;
  const suggested = Math.round((distanceKm * perKm * mult * acMult) / 5) * 5;
  const min       = Math.round(suggested * 0.85 / 5) * 5;
  const max       = Math.round(suggested * 1.25 / 5) * 5;
  return { suggested, min, max, perKm: Math.round(perKm * mult * acMult) };
};