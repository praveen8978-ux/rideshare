'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, Calendar, Users, Car,
  ChevronRight, Wind, Package
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Ride {
  id: string;
  driver: { id: string; name: string; avatar?: string; rating: number; reviews: number };
  vehicle: { make: string; model: string; color: string; type: string; ac: boolean };
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
  { from: 'Vijayawada', to: 'Hyderabad',  fromLat: 16.5062, fromLng: 80.6480, toLat: 17.3850, toLng: 78.4867 },
  { from: 'Guntur',     to: 'Vijayawada', fromLat: 16.3067, fromLng: 80.4365, toLat: 16.5062, toLng: 80.6480 },
  { from: 'Nellore',    to: 'Chennai',    fromLat: 14.4426, fromLng: 79.9865, toLat: 13.0827, toLng: 80.2707 },
  { from: 'Tirupati',   to: 'Hyderabad',  fromLat: 13.6288, fromLng: 79.4192, toLat: 17.3850, toLng: 78.4867 },
];

export default function RideSearchPage() {
  const router = useRouter();

  const [pickup,    setPickup]    = useState('');
  const [dropoff,   setDropoff]   = useState('');
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [seats,     setSeats]     = useState(1);
  const [womenOnly, setWomenOnly] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [rides,     setRides]     = useState<Ride[]>([]);
  const [searched,  setSearched]  = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const geocode = async (address: string) => {
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'hyderabad': { lat: 17.3850, lng: 78.4867 }, 'vijayawada': { lat: 16.5062, lng: 80.6480 },
      'guntur': { lat: 16.3067, lng: 80.4365 }, 'nellore': { lat: 14.4426, lng: 79.9865 },
      'tirupati': { lat: 13.6288, lng: 79.4192 }, 'chennai': { lat: 13.0827, lng: 80.2707 },
      'bangalore': { lat: 12.9716, lng: 77.5946 }, 'mumbai': { lat: 19.0760, lng: 72.8777 },
    };
    const key = address.toLowerCase().trim();
    return cityCoords[key] || { lat: 17.3850, lng: 78.4867 };
  };

  const handleSearch = async () => {
    if (!pickup.trim() || !dropoff.trim()) { toast.error('Enter pickup and dropoff locations'); return; }
    setLoading(true);
    try {
      const [pCoords, dCoords] = await Promise.all([geocode(pickup), geocode(dropoff)]);
      const { data } = await api.get('/rides/search', {
        params: { pickupLat: pCoords.lat, pickupLng: pCoords.lng, dropoffLat: dCoords.lat, dropoffLng: dCoords.lng, date, seats, womenOnly },
      });
      setRides(data.rides || []);
      setSearched(true);
      if (data.rides?.length === 0) toast('No rides found. Try a nearby date.', { icon: '🔍' });
    } catch {
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePopularRoute = (route: typeof POPULAR_ROUTES[0]) => {
    setPickup(route.from);
    setDropoff(route.to);
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-mist-50">

      {/* Header */}
      <div className="gradient-ink noise-overlay">
        <div className="max-w-2xl mx-auto px-5 pt-5 pb-7">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.back()} className="w-9 h-9 glass-dark rounded-xl flex items-center justify-center text-white border border-white/10">←</button>
            <h1 className="text-white font-display font-bold text-lg tracking-tight">Find a ride</h1>
          </div>

          {/* Search form */}
          <div className="bg-white rounded-3xl p-5 shadow-glass-lg space-y-3">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-violet-500" />
              <input
                type="text" placeholder="From — pickup location" value={pickup}
                onChange={e => setPickup(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-3.5 text-[15px] rounded-2xl border border-mist-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-px bg-mist-100" />
              <button onClick={() => { const t = pickup; setPickup(dropoff); setDropoff(t); }} className="w-8 h-8 rounded-full border border-mist-200 flex items-center justify-center text-mist-400 hover:border-violet-300 hover:text-violet-500 transition-colors text-base">⇅</button>
              <div className="flex-1 h-px bg-mist-100" />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gold-500" />
              <input
                type="text" placeholder="To — dropoff location" value={dropoff}
                onChange={e => setDropoff(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-3.5 text-[15px] rounded-2xl border border-mist-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-400" />
                <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} className="w-full pl-9 pr-3 py-3 text-sm rounded-2xl border border-mist-200 focus:border-violet-400 outline-none" />
              </div>
              <div className="relative">
                <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-400" />
                <select value={seats} onChange={e => setSeats(Number(e.target.value))} className="w-full pl-9 pr-3 py-3 text-sm rounded-2xl border border-mist-200 focus:border-violet-400 outline-none appearance-none bg-white">
                  {[1,2,3,4].map(n => <option key={n} value={n}>{n} seat{n>1?'s':''}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 px-1 cursor-pointer pt-1">
              <div onClick={() => setWomenOnly(!womenOnly)} className={`w-10 h-5 rounded-full transition-colors relative ${womenOnly ? 'bg-violet-500' : 'bg-mist-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${womenOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-mist-600">Women-only rides</span>
            </label>

            <Button fullWidth size="lg" loading={loading} onClick={handleSearch} icon={<Search size={18} />}>Search rides</Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5">

        {!searched && (
          <div className="mb-6">
            <p className="text-sm font-medium text-mist-500 mb-3">Popular routes</p>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_ROUTES.map(r => (
                <button key={r.from + r.to} onClick={() => handlePopularRoute(r)} className="flex items-center gap-2 bg-white border border-mist-100 rounded-2xl px-3.5 py-3 text-left hover:border-violet-200 hover:bg-violet-50/50 transition-all group">
                  <MapPin size={14} className="text-violet-400 flex-shrink-0" />
                  <span className="text-xs text-mist-600 group-hover:text-violet-700">{r.from} → {r.to}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Spinner size="lg" />
            <p className="text-mist-500 text-sm">Searching rides on your route...</p>
          </div>
        )}

        {!loading && searched && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-ink-700">{rides.length > 0 ? `${rides.length} ride${rides.length>1?'s':''} found` : 'No rides found'}</p>
              {rides.length > 0 && <p className="text-xs text-mist-400">{pickup} → {dropoff}</p>}
            </div>

            {rides.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 bg-mist-100 rounded-2xl flex items-center justify-center mb-4"><Car size={26} className="text-mist-300" /></div>
                <p className="font-display font-semibold text-ink-800 mb-1">No rides on this route</p>
                <p className="text-sm text-mist-400 mb-6 max-w-xs">Try a nearby date or different pickup/dropoff points</p>
                <Button variant="secondary" size="sm" onClick={() => setSearched(false)}>Modify search</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rides.map(ride => (
                  <RideCard key={ride.id} ride={ride} onClick={() => router.push(`/rides/${ride.id}`)} formatTime={formatTime} formatDate={formatDate} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RideCard({ ride, onClick, formatTime, formatDate }: { ride: Ride; onClick: () => void; formatTime: (s: string) => string; formatDate: (s: string) => string; }) {
  return (
    <div onClick={onClick} className="bg-white rounded-3xl border border-mist-100 p-5 cursor-pointer card-hover active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={ride.driver.name} src={ride.driver.avatar} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-ink-900 text-sm tracking-tight">{ride.driver.name}</span>
            {ride.preferences.womenOnly && <Badge label="Women only" variant="danger" size="sm" />}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <StarRating rating={ride.driver.rating} size={12} />
            <span className="text-xs text-mist-400">{ride.driver.rating > 0 ? ride.driver.rating.toFixed(1) : 'New'} · {ride.driver.reviews} trips</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-ink-900">₹{ride.fare.perSeat}</div>
          <div className="text-xs text-mist-400">per seat</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 bg-mist-50 rounded-2xl p-3.5">
        <div className="flex flex-col items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          <div className="w-0.5 h-6 bg-mist-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs font-medium text-ink-800 truncate">{ride.origin.name}</p>
            <p className="text-xs text-mist-400">{formatTime(ride.departureTime)} · {formatDate(ride.departureTime)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-800 truncate">{ride.destination.name}</p>
            <p className="text-xs text-mist-400">{ride.segmentKm} km on your segment</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-mist-500">
        <div className="flex items-center gap-1"><Car size={12} /><span>{ride.vehicle.make} {ride.vehicle.model}</span></div>
        <div className="flex items-center gap-1"><Users size={12} /><span>{ride.seatsAvailable} left</span></div>
        {ride.preferences.ac && <div className="flex items-center gap-1 text-violet-500"><Wind size={12} /><span>AC</span></div>}
        {ride.allowsParcels && <div className="flex items-center gap-1 text-gold-500"><Package size={12} /><span>Parcels</span></div>}
        <ChevronRight size={14} className="ml-auto text-mist-300" />
      </div>
    </div>
  );
}