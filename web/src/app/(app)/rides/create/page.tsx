'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Clock, Users, IndianRupee, Car,
  ChevronLeft, Plus, Trash2, Wind, Package,
  Shield, AlertCircle, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  color: string;
  type: string;
  plate_number: string;
  total_seats: number;
  ac_available: boolean;
}

const VEHICLE_TYPES = ['bike','auto','car','suv','van'];

const POPULAR_CITIES = [
  'Hyderabad','Vijayawada','Guntur','Nellore',
  'Tirupati','Visakhapatnam','Chennai','Bangalore','Mumbai','Delhi'
];

export default function CreateRidePage() {
  const router = useRouter();

  // Form state
  const [step,          setStep]          = useState<1|2|3>(1);
  const [originName,    setOriginName]    = useState('');
  const [destName,      setDestName]      = useState('');
  const [originLat,     setOriginLat]     = useState(0);
  const [originLng,     setOriginLng]     = useState(0);
  const [destLat,       setDestLat]       = useState(0);
  const [destLng,       setDestLng]       = useState(0);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [totalSeats,    setTotalSeats]    = useState(2);
  const [baseFare,      setBaseFare]      = useState('');
  const [womenOnly,     setWomenOnly]     = useState(false);
  const [acRide,        setAcRide]        = useState(false);
  const [allowsParcels, setAllowsParcels] = useState(false);
  const [parcelFare,    setParcelFare]    = useState('');
  const [luggageAllowed,setLuggageAllowed]= useState(true);
  const [notes,         setNotes]         = useState('');
  const [loading,       setLoading]       = useState(false);

  // Vehicle state
  const [vehicles,       setVehicles]       = useState<Vehicle[]>([]);
  const [selectedVehicle,setSelectedVehicle]= useState<Vehicle|null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);

  // New vehicle form
  const [vType,   setVType]   = useState('car');
  const [vMake,   setVMake]   = useState('');
  const [vModel,  setVModel]  = useState('');
  const [vYear,   setVYear]   = useState('');
  const [vColor,  setVColor]  = useState('');
  const [vPlate,  setVPlate]  = useState('');
  const [vSeats,  setVSeats]  = useState(4);
  const [vAc,     setVAc]     = useState(false);
  const [vLoading,setVLoading]= useState(false);

  const today    = new Date().toISOString().split('T')[0];
  const minTime  = departureDate === today
    ? new Date().toTimeString().slice(0,5)
    : '00:00';

  // Geocode city name
  const geocodeCity = async (city: string): Promise<{lat:number,lng:number}> => {
    const cityCoords: Record<string,{lat:number,lng:number}> = {
      'hyderabad':     { lat: 17.3850, lng: 78.4867 },
      'vijayawada':    { lat: 16.5062, lng: 80.6480 },
      'guntur':        { lat: 16.3067, lng: 80.4365 },
      'nellore':       { lat: 14.4426, lng: 79.9865 },
      'tirupati':      { lat: 13.6288, lng: 79.4192 },
      'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
      'chennai':       { lat: 13.0827, lng: 80.2707 },
      'bangalore':     { lat: 12.9716, lng: 77.5946 },
      'mumbai':        { lat: 19.0760, lng: 72.8777 },
      'delhi':         { lat: 28.6139, lng: 77.2090 },
    };
    return cityCoords[city.toLowerCase().trim()] || { lat: 17.3850, lng: 78.4867 };
  };

  // Calculate distance between two points
  const calcDistance = (lat1:number,lng1:number,lat2:number,lng2:number) => {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return Math.round(2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
  };

  // Suggest fare based on distance
  const suggestFare = () => {
    if (!originLat || !destLat) return;
    const dist = calcDistance(originLat,originLng,destLat,destLng);
    const perKm = { bike:2.5, auto:3, car:4.5, suv:6, van:7 }[selectedVehicle?.type||'car'] || 4.5;
    const suggested = Math.round((dist * perKm) / 5) * 5;
    setBaseFare(suggested.toString());
    toast.success(`Suggested fare: ₹${suggested} for ~${dist}km`);
  };

  const loadVehicles = async () => {
    if (vehiclesLoaded) return;
    try {
      const { data } = await api.get('/users/vehicles');
      setVehicles(data.vehicles || []);
      setVehiclesLoaded(true);
      if (data.vehicles?.length === 0) setShowAddVehicle(true);
    } catch {
      toast.error('Failed to load vehicles');
    }
  };

  const handleAddVehicle = async () => {
    if (!vMake||!vModel||!vYear||!vColor||!vPlate) {
      toast.error('Fill all vehicle details');
      return;
    }
    setVLoading(true);
    try {
      const { data } = await api.post('/users/vehicles', {
        type: vType, make: vMake, model: vModel,
        year: Number(vYear), color: vColor,
        plateNumber: vPlate.toUpperCase(),
        totalSeats: vSeats, acAvailable: vAc,
      });
      setVehicles(v => [...v, data.vehicle]);
      setSelectedVehicle(data.vehicle);
      setShowAddVehicle(false);
      toast.success('Vehicle added!');
      // Reset form
      setVMake(''); setVModel(''); setVYear('');
      setVColor(''); setVPlate('');
    } catch (e:any) {
      toast.error(e?.response?.data?.error || 'Failed to add vehicle');
    } finally {
      setVLoading(false);
    }
  };

  const handleStep1 = async () => {
    if (!originName.trim() || !destName.trim()) {
      toast.error('Enter origin and destination');
      return;
    }
    if (originName.toLowerCase() === destName.toLowerCase()) {
      toast.error('Origin and destination cannot be same');
      return;
    }
    if (!departureDate || !departureTime) {
      toast.error('Select departure date and time');
      return;
    }
    const [oCoords, dCoords] = await Promise.all([
      geocodeCity(originName),
      geocodeCity(destName),
    ]);
    setOriginLat(oCoords.lat); setOriginLng(oCoords.lng);
    setDestLat(dCoords.lat);   setDestLng(dCoords.lng);
    await loadVehicles();
    setStep(2);
  };

  const handleStep2 = () => {
    if (!selectedVehicle) {
      toast.error('Select a vehicle');
      return;
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!baseFare || Number(baseFare) < 10) {
      toast.error('Enter a valid base fare (min ₹10)');
      return;
    }
    if (!selectedVehicle) return;

    setLoading(true);
    try {
      const departureISO = new Date(`${departureDate}T${departureTime}`).toISOString();
      const dist         = calcDistance(originLat,originLng,destLat,destLng);

      // Simple encoded polyline (straight line for now — replace with Google Directions)
      const polyline = encodeSimplePolyline(originLat,originLng,destLat,destLng);

      const { data } = await api.post('/rides', {
        vehicleId:        selectedVehicle.id,
        originName:       originName.trim(),
        originLat, originLng,
        destName:         destName.trim(),
        destLat, destLng,
        routePolyline:    polyline,
        routeDistanceKm:  dist,
        waypoints:        [],
        departureTime:    departureISO,
        totalSeats,
        baseFare:         Number(baseFare),
        womenOnly, acRide,
        allowsParcels,
        parcelFare:       allowsParcels ? Number(parcelFare) : null,
        luggageAllowed,
        smokingAllowed:   false,
        petsAllowed:      false,
        notes:            notes.trim() || null,
      });

      toast.success('Ride posted successfully! 🎉');
      router.push('/driver/dashboard');
    } catch (e:any) {
      toast.error(e?.response?.data?.error || 'Failed to post ride');
    } finally {
      setLoading(false);
    }
  };

  // Simple polyline encoder for straight line
  const encodeSimplePolyline = (lat1:number,lng1:number,lat2:number,lng2:number) => {
    const encode = (v:number) => {
      let value = Math.round(v * 1e5);
      value = value < 0 ? ~(value << 1) : value << 1;
      let result = '';
      while (value >= 0x20) {
        result += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
        value >>= 5;
      }
      result += String.fromCharCode(value + 63);
      return result;
    };
    // Mid point for a slightly curved line
    const midLat = (lat1+lat2)/2;
    const midLng = (lng1+lng2)/2;
    let poly = '';
    let prevLat = 0, prevLng = 0;
    for (const [lat,lng] of [[lat1,lng1],[midLat,midLng],[lat2,lng2]]) {
      poly += encode(lat - prevLat) + encode(lng - prevLng);
      prevLat = lat; prevLng = lng;
    }
    return poly;
  };

  const dist = originLat && destLat ? calcDistance(originLat,originLng,destLat,destLng) : 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="gradient-hero">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => step > 1 ? setStep(s => (s-1) as 1|2|3) : router.back()}
              className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-white border border-white/20"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-white font-bold text-lg">Offer a ride</h1>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {[1,2,3].map(s => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 ${s <= step ? 'text-white' : 'text-white/40'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${s < step ? 'bg-white text-primary-600 border-white' : s === step ? 'border-white text-white' : 'border-white/30 text-white/40'}`}>
                    {s < step ? <CheckCircle size={14} /> : s}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {s === 1 ? 'Route' : s === 2 ? 'Vehicle' : 'Details'}
                  </span>
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-white' : 'bg-white/20'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── Step 1: Route & Time ── */}
        {step === 1 && (
          <>
            <Card padding="md">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary-500" /> Route details
              </h2>
              <div className="space-y-3">

                {/* Origin */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">FROM — Starting point</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary-500 border-2 border-primary-200" />
                    <input
                      type="text"
                      placeholder="e.g. Vijayawada"
                      value={originName}
                      onChange={e => setOriginName(e.target.value)}
                      list="origin-cities"
                      className="w-full pl-8 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                    <datalist id="origin-cities">
                      {POPULAR_CITIES.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>

                {/* Dest */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">TO — Destination</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-400 border-2 border-red-200" />
                    <input
                      type="text"
                      placeholder="e.g. Hyderabad"
                      value={destName}
                      onChange={e => setDestName(e.target.value)}
                      list="dest-cities"
                      className="w-full pl-8 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                    <datalist id="dest-cities">
                      {POPULAR_CITIES.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={departureDate}
                      min={today}
                      onChange={e => setDepartureDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Time</label>
                    <input
                      type="time"
                      value={departureTime}
                      min={minTime}
                      onChange={e => setDepartureTime(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary-400 outline-none"
                    />
                  </div>
                </div>

                {/* Seats */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Available seats</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5,6].map(n => (
                      <button
                        key={n}
                        onClick={() => setTotalSeats(n)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${totalSeats === n ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Button fullWidth size="lg" onClick={handleStep1}>
              Continue to vehicle →
            </Button>
          </>
        )}

        {/* ── Step 2: Vehicle ── */}
        {step === 2 && (
          <>
            <Card padding="md">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car size={18} className="text-primary-500" /> Select vehicle
              </h2>

              {vehicles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selectedVehicle?.id === v.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedVehicle?.id === v.id ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        <Car size={20} className={selectedVehicle?.id === v.id ? 'text-primary-600' : 'text-gray-400'} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{v.make} {v.model}</p>
                        <p className="text-xs text-gray-400">{v.color} · {v.plate_number} · {v.total_seats} seats</p>
                      </div>
                      <div className="flex gap-1">
                        {v.ac_available && <Badge label="AC" variant="info" size="sm" />}
                        <Badge label={v.type} variant="default" size="sm" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowAddVehicle(!showAddVehicle)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-all text-sm font-medium"
              >
                <Plus size={16} /> Add new vehicle
              </button>

              {/* Add vehicle form */}
              {showAddVehicle && (
                <div className="mt-4 space-y-3 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700">Vehicle details</p>

                  {/* Type */}
                  <div className="flex gap-2 flex-wrap">
                    {VEHICLE_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setVType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${vType === t ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Make" placeholder="Maruti" value={vMake} onChange={e => setVMake(e.target.value)} />
                    <Input label="Model" placeholder="Swift" value={vModel} onChange={e => setVModel(e.target.value)} />
                    <Input label="Year" placeholder="2022" value={vYear} onChange={e => setVYear(e.target.value)} />
                    <Input label="Color" placeholder="White" value={vColor} onChange={e => setVColor(e.target.value)} />
                    <Input label="Plate number" placeholder="AP39AB1234" value={vPlate} onChange={e => setVPlate(e.target.value.toUpperCase())} />
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Seats</label>
                      <select
                        value={vSeats}
                        onChange={e => setVSeats(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 outline-none"
                      >
                        {[2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} seats</option>)}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setVAc(!vAc)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${vAc ? 'bg-blue-500' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${vAc ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-gray-600">AC available</span>
                  </label>

                  <Button fullWidth variant="secondary" loading={vLoading} onClick={handleAddVehicle}>
                    Save vehicle
                  </Button>
                </div>
              )}
            </Card>

            <Button fullWidth size="lg" onClick={handleStep2} disabled={!selectedVehicle}>
              Continue to pricing →
            </Button>
          </>
        )}

        {/* ── Step 3: Pricing & Preferences ── */}
        {step === 3 && (
          <>
            {/* Fare */}
            <Card padding="md">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <IndianRupee size={18} className="text-primary-500" /> Set your fare
              </h2>

              {dist > 0 && (
                <div className="bg-primary-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary-600 font-medium">Estimated distance</p>
                    <p className="text-lg font-bold text-primary-700">{dist} km</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={suggestFare}>
                    Auto-suggest fare
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <Input
                  label="Base fare per seat (₹)"
                  type="number"
                  placeholder="e.g. 250"
                  value={baseFare}
                  onChange={e => setBaseFare(e.target.value)}
                  hint="Passengers pay this + platform fee of 15%"
                  icon={<IndianRupee size={14} />}
                />

                {baseFare && Number(baseFare) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Passenger pays</span>
                      <span className="font-medium">₹{Math.round(Number(baseFare) * 1.15)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Platform fee (15%)</span>
                      <span>- ₹{Math.round(Number(baseFare) * 0.15)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-semibold border-t border-gray-200 pt-1.5">
                      <span>You earn per seat</span>
                      <span>₹{Number(baseFare)}</span>
                    </div>
                    {totalSeats > 1 && (
                      <div className="flex justify-between text-primary-600 font-bold">
                        <span>Max earnings ({totalSeats} seats)</span>
                        <span>₹{Number(baseFare) * totalSeats}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Preferences */}
            <Card padding="md">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-primary-500" /> Preferences
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Women-only ride', sub: 'Only women can book this ride', val: womenOnly, set: setWomenOnly, color: 'bg-pink-500' },
                  { label: 'AC ride',          sub: 'Air conditioned vehicle',       val: acRide,    set: setAcRide,    color: 'bg-blue-500' },
                  { label: 'Luggage allowed',  sub: 'Passengers can carry luggage',  val: luggageAllowed, set: setLuggageAllowed, color: 'bg-green-500' },
                  { label: 'Accept parcels',   sub: 'Earn extra by delivering parcels on route', val: allowsParcels, set: setAllowsParcels, color: 'bg-amber-500' },
                ].map(p => (
                  <div key={p.label} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.label}</p>
                      <p className="text-xs text-gray-400">{p.sub}</p>
                    </div>
                    <div
                      onClick={() => p.set(!p.val)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${p.val ? p.color : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.val ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </div>
                ))}

                {allowsParcels && (
                  <Input
                    label="Parcel fare (₹)"
                    type="number"
                    placeholder="e.g. 100"
                    value={parcelFare}
                    onChange={e => setParcelFare(e.target.value)}
                    hint="Extra you charge per parcel delivery"
                  />
                )}
              </div>
            </Card>

            {/* Notes */}
            <Card padding="md">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Notes for passengers <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                placeholder="e.g. Will stop at Guntur for 15 mins. No smoking please."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
              />
            </Card>

            {/* Summary */}
            <Card padding="md" className="border-primary-100 bg-primary-50/30">
              <h3 className="font-semibold text-gray-900 mb-3">Ride summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Route</span>
                  <span className="font-medium text-gray-800">{originName} → {destName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Departure</span>
                  <span className="font-medium text-gray-800">{departureDate} at {departureTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium text-gray-800">{selectedVehicle?.make} {selectedVehicle?.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Seats offered</span>
                  <span className="font-medium text-gray-800">{totalSeats}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fare per seat</span>
                  <span className="font-bold text-primary-600">₹{baseFare || '—'}</span>
                </div>
              </div>
            </Card>

            <Button fullWidth size="lg" loading={loading} onClick={handleSubmit}>
              Post ride 🚀
            </Button>

            <p className="text-center text-xs text-gray-400 pb-6">
              By posting, you agree to our driver terms. Platform takes 15% commission per booking.
            </p>
          </>
        )}
      </div>
    </div>
  );
}