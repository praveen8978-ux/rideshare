'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, Calendar, Users, ArrowRight,
  Filter, Star, Car, Clock, ChevronRight, Wind, Package
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Ride {
  id: string;
  driver: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    reviews: number;
  };
  vehicle: {
    make: string;
    model: string;
    color: string;
    type: string;
    ac: boolean;
  };
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  departureTime: string;
  seatsAvailable: number;
  fare: { total: number; perSeat: number; surgeApplied: boolean };
  segmentKm: number;
  preferences: { womenOnly: boolean; ac: boolean; luggage: boolean };
  allowsParcels: boolean;
}

const POPULAR_ROUTES = [
  { from: 'Vijayawada', to: 'Hyderabad',   fromLat: 16.5062, fromLng: 80.6480, toLat: 17.3850, toLng: 78.4867 },
  { from: 'Guntur',     to: 'Vijayawada',  fromLat: 16.3067, fromLng: 80.4365, toLat: 16.5062, toLng: 80.6480 },
  { from: 'Nellore',    to: 'Chennai',     fromLat: 14.4426, fromLng: 79.9865, toLat: 13.0827, toLng: 80.2707 },
  { from: 'Tirupati',   to: 'Hyderabad',   fromLat: 13.6288, fromLng: 79.4192, toLat: 17.3850, toLng: 78.4867 },
];

export default function RideSearchPage() {
  const router = useRouter();

  const [pickup,       setPickup]       = useState('');
  const [dropoff,      setDropoff]      = useState('');
  const [date,         setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [seats,        setSeats]        = useState(1);
  const [womenOnly,    setWomenOnly]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [rides,        setRides]        = useState<Ride[]>([]);
  const [searched,     setSearched]     = useState(false);

  // Coords state
  const [pickupCoords,  setPickupCoords]  = useState<{lat:number,lng:number}|null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat:number,lng:number}|null>(null);

  const today = new Date().toISOString().split('T')[0];

  const geocode = async (address: string): Promise<{lat:number,lng:number}|null> => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
      // Demo mode — use approximate coords for popular cities
      const cityCoords: Record<string, {lat:number,lng:number}> = {
        'hyderabad':  { lat: 17.3850, lng: 78.4867 },
        'vijayawada': { lat: 16.5062, lng: 80.6480 },
        'guntur':     { lat: 16.3067, lng: 80.4365 },
        'nellore':    { lat: 14.4426, lng: 79.9865 },
        'tirupati':   { lat: 13.6288, lng: 79.4192 },
        'chennai':    { lat: 13.0827, lng: 80.2707 },
        'bangalore':  { lat: 12.9716, lng: 77.5946 },
        'mumbai':     { lat: 19.0760, lng: 72.8777 },
      };
      const key = address.toLowerCase().trim();
      return cityCoords[key] || { lat: 17.3850, lng: 78.4867 };
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();
      if (data.results[0]) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch {}
    return null;
  };

  const handleSearch = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      toast.error('Enter pickup and dropoff locations');
      return;
    }
    if (!date) {
      toast.error('Select a date');
      return;
    }

    setLoading(true);
    try {
      const [pCoords, dCoords] = await Promise.all([
        geocode(pickup),
        geocode(dropoff),
      ]);

      if (!pCoords || !dCoords) {
        toast.error('Could not find locations. Try city names.');
        return;
      }

      setPickupCoords(pCoords);
      setDropoffCoords(dCoords);

      const { data } = await api.get('/rides/search', {
        params: {
          pickupLat:  pCoords.lat,
          pickupLng:  pCoords.lng,
          dropoffLat: dCoords.lat,
          dropoffLng: dCoords.lng,
          date,
          seats,
          womenOnly,
        },
      });

      setRides(data.rides || []);
      setSearched(true);

      if (data.rides?.length === 0) {
        toast('No rides found for this route. Try a nearby date!', { icon: '🔍' });
      }
    } catch (e: any) {
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePopularRoute = (route: typeof POPULAR_ROUTES[0]) => {
    setPickup(route.from);
    setDropoff(route.to);
    setPickupCoords({ lat: route.fromLat, lng: route.fromLng });
    setDropoffCoords({ lat: route.toLat, lng: route.toLng });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="gradient-hero pt-safe">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-white border border-white/20"
            >
              ←
            </button>
            <h1 className="text-white font-bold text-lg">Find a ride</h1>
          </div>

          {/* Search form */}
          <div className="bg-white rounded-2xl p-4 shadow-modal space-y-3">

            {/* Pickup */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                <div className="w-3 h-3 rounded-full bg-primary-500 border-2 border-primary-200" />
              </div>
              <input
                type="text"
                placeholder="From — pickup location"
                value={pickup}
                onChange={e => setPickup(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-8 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            {/* Swap button */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-100" />
              <button
                onClick={() => {
                  const tmp = pickup; setPickup(dropoff); setDropoff(tmp);
                  const tmpC = pickupCoords; setPickupCoords(dropoffCoords); setDropoffCoords(tmpC);
                }}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors text-lg"
              >
                ⇅
              </button>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Dropoff */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 rounded-full bg-red-400 border-2 border-red-200" />
              </div>
              <input
                type="text"
                placeholder="To — dropoff location"
                value={dropoff}
                onChange={e => setDropoff(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-8 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>

            {/* Date + Seats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary-400 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={seats}
                  onChange={e => setSeats(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary-400 outline-none transition-all appearance-none bg-white"
                >
                  {[1,2,3,4].map(n => (
                    <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Women only toggle */}
            <label className="flex items-center gap-3 px-1 cursor-pointer">
              <div
                onClick={() => setWomenOnly(!womenOnly)}
                className={`w-10 h-5 rounded-full transition-colors relative ${womenOnly ? 'bg-pink-500' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${womenOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-gray-600">Women-only rides</span>
              {womenOnly && <Badge label="Active" variant="danger" size="sm" />}
            </label>

            <Button fullWidth size="lg" loading={loading} onClick={handleSearch} icon={<Search size={18} />}>
              Search rides
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* Popular routes */}
        {!searched && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-500 mb-3">Popular routes</p>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_ROUTES.map(r => (
                <button
                  key={r.from + r.to}
                  onClick={() => handlePopularRoute(r)}
                  className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-left hover:border-primary-200 hover:bg-primary-50 transition-all group"
                >
                  <MapPin size={14} className="text-primary-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600 group-hover:text-primary-700">
                    {r.from} → {r.to}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Spinner size="lg" />
            <p className="text-gray-500 text-sm">Searching rides on your route...</p>
          </div>
        )}

        {/* Results */}
        {!loading && searched && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700">
                {rides.length > 0
                  ? `${rides.length} ride${rides.length > 1 ? 's' : ''} found`
                  : 'No rides found'}
              </p>
              {rides.length > 0 && (
                <p className="text-xs text-gray-400">{pickup} → {dropoff}</p>
              )}
            </div>

            {rides.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Car size={28} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">No rides on this route</p>
                <p className="text-sm text-gray-400 mb-6 max-w-xs">
                  Try a nearby date or different pickup/dropoff points
                </p>
                <Button variant="secondary" size="sm" onClick={() => setSearched(false)}>
                  Modify search
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rides.map(ride => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    onClick={() => router.push(`/rides/${ride.id}`)}
                    formatTime={formatTime}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tips when not searched */}
        {!searched && !loading && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-500 mb-3">How route matching works</p>
            {[
              { icon: '🗺️', title: 'Route-based, not destination-based', desc: "Find rides even if the driver's destination is different — as long as they pass through your area." },
              { icon: '💰', title: 'AI fare calculation', desc: 'Fare is auto-calculated based on your segment distance, not the full route.' },
              { icon: '🛡️', title: 'Verified drivers', desc: 'All drivers have verified IDs, vehicles, and ratings from previous rides.' },
            ].map(t => (
              <div key={t.title} className="flex gap-3 bg-white rounded-xl p-4 border border-gray-100">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Ride Card Component
function RideCard({
  ride, onClick, formatTime, formatDate,
}: {
  ride: Ride;
  onClick: () => void;
  formatTime: (s: string) => string;
  formatDate: (s: string) => string;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 cursor-pointer hover:border-primary-200 hover:shadow-md transition-all active:scale-[0.99]"
    >
      {/* Driver row */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={ride.driver.name} src={ride.driver.avatar} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{ride.driver.name}</span>
            {ride.preferences.womenOnly && <Badge label="Women only" variant="danger" size="sm" />}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <StarRating rating={ride.driver.rating} size={12} />
            <span className="text-xs text-gray-400">
              {ride.driver.rating > 0 ? ride.driver.rating.toFixed(1) : 'New'} · {ride.driver.reviews} trips
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">₹{ride.fare.perSeat}</div>
          <div className="text-xs text-gray-400">per seat</div>
          {ride.fare.surgeApplied && (
            <Badge label="Surge" variant="warning" size="sm" />
          )}
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-xl p-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
          <div className="w-0.5 h-6 bg-gray-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs font-medium text-gray-800 truncate">{ride.origin.name}</p>
            <p className="text-xs text-gray-400">{formatTime(ride.departureTime)} · {formatDate(ride.departureTime)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-800 truncate">{ride.destination.name}</p>
            <p className="text-xs text-gray-400">{ride.segmentKm} km on your segment</p>
          </div>
        </div>
      </div>

      {/* Details row */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Car size={12} />
          <span>{ride.vehicle.make} {ride.vehicle.model}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={12} />
          <span>{ride.seatsAvailable} seats left</span>
        </div>
        {ride.preferences.ac && (
          <div className="flex items-center gap-1 text-blue-500">
            <Wind size={12} />
            <span>AC</span>
          </div>
        )}
        {ride.allowsParcels && (
          <div className="flex items-center gap-1 text-amber-500">
            <Package size={12} />
            <span>Parcels</span>
          </div>
        )}
        <ChevronRight size={14} className="ml-auto text-gray-300" />
      </div>
    </div>
  );
}