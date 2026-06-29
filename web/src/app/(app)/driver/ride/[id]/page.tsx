'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MapPin, Clock, Users, Star, Car, Wind,
  Package, ChevronLeft, Shield, MessageCircle,
  AlertCircle, CheckCircle, IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function RideDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const user   = getUser();

  const [ride,        setRide]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [booking,     setBooking]     = useState(false);
  const [showBook,    setShowBook]    = useState(false);
  const [seats,       setSeats]       = useState(1);
  const [pickupName,  setPickupName]  = useState('');
  const [dropoffName, setDropoffName] = useState('');

  useEffect(() => { loadRide(); }, [id]);

  const loadRide = async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);
      setPickupName(data.ride.origin_name);
      setDropoffName(data.ride.dest_name);
    } catch {
      toast.error('Ride not found');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!pickupName.trim() || !dropoffName.trim()) {
      toast.error('Enter pickup and dropoff locations');
      return;
    }
    setBooking(true);
    try {
      const { data } = await api.post('/bookings', {
        rideId:      id,
        seatsBooked: seats,
        pickupName,  pickupLat: ride.origin_lat,  pickupLng: ride.origin_lng,
        dropoffName, dropoffLat: ride.dest_lat,   dropoffLng: ride.dest_lng,
      });
      toast.success('Booking request sent! Waiting for driver to accept.');
      setShowBook(false);
      router.push('/bookings');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  if (loading) return <Spinner fullScreen />;
  if (!ride)   return null;

  const fare        = Number(ride.base_fare);
  const platformFee = Math.round(fare * 0.15);
  const total       = fare + platformFee;
  const isOwn       = user?.id === ride.driver_id;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <div className="gradient-hero">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/20"
            >
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-white font-bold text-lg">Ride details</h1>
          </div>

          {/* Route summary */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-white" />
                <div className="w-0.5 h-8 bg-white/40" />
                <div className="w-3 h-3 rounded-full bg-red-300" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-white font-semibold">{ride.origin_name}</p>
                  <p className="text-white/60 text-xs">{formatDateTime(ride.departure_time)}</p>
                </div>
                <div>
                  <p className="text-white font-semibold">{ride.dest_name}</p>
                  <p className="text-white/60 text-xs">{ride.route_distance_km} km total route</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">₹{fare}</div>
                <div className="text-white/60 text-xs">per seat</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">

        {/* Driver card */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Driver</h3>
          <div className="flex items-center gap-3">
            <Avatar name={ride.driver_name} src={ride.avatar_url} size="lg" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{ride.driver_name}</p>
              <StarRating rating={Number(ride.driver_rating)} showValue count={0} />
            </div>
            <button className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 hover:bg-primary-100 transition-colors">
              <MessageCircle size={18} />
            </button>
          </div>
        </Card>

        {/* Vehicle */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Vehicle</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Car size={22} className="text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {ride.make} {ride.model}
              </p>
              <p className="text-sm text-gray-400">{ride.color} · {ride.plate_number}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {ride.ac_available && <Badge label="AC" variant="info" />}
              <Badge label={ride.vehicle_type} variant="default" />
            </div>
          </div>
        </Card>

        {/* Trip info */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Trip info</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Users size={16} className="text-primary-500" />, label: 'Seats available', value: `${ride.seats_available} of ${ride.total_seats}` },
              { icon: <Clock size={16} className="text-primary-500" />, label: 'Departure', value: formatDateTime(ride.departure_time) },
              { icon: <Shield size={16} className="text-pink-500" />,   label: 'Women only', value: ride.women_only ? 'Yes' : 'No' },
              { icon: <Package size={16} className="text-amber-500" />, label: 'Parcels', value: ride.allows_parcels ? 'Accepted' : 'No' },
            ].map(i => (
              <div key={i.label} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">{i.icon}<span className="text-xs text-gray-400">{i.label}</span></div>
                <p className="text-sm font-semibold text-gray-800">{i.value}</p>
              </div>
            ))}
          </div>

          {ride.notes && (
            <div className="mt-3 bg-amber-50 rounded-xl p-3 flex gap-2">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">{ride.notes}</p>
            </div>
          )}
        </Card>

        {/* Fare breakdown */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Fare breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Base fare × {seats} seat{seats > 1 ? 's' : ''}</span>
              <span>₹{fare * seats}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Platform fee (15%)</span>
              <span>₹{platformFee * seats}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-primary-600">₹{total * seats}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom action */}
      {!isOwn && ride.status === 'scheduled' && ride.seats_available > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-400">Total price</p>
              <p className="text-xl font-bold text-gray-900">₹{total * seats}</p>
            </div>
            <Button fullWidth size="lg" onClick={() => setShowBook(true)}>
              Request seat
            </Button>
          </div>
        </div>
      )}

      {isOwn && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-4">
          <div className="max-w-2xl mx-auto">
            <Button fullWidth variant="secondary" onClick={() => router.push(`/driver/ride/${id}`)}>
              Manage this ride
            </Button>
          </div>
        </div>
      )}

      {/* Booking modal */}
      <Modal open={showBook} onClose={() => setShowBook(false)} title="Request a seat" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Number of seats</label>
            <div className="flex gap-2">
              {Array.from({ length: Math.min(ride.seats_available, 4) }, (_,i) => i+1).map(n => (
                <button
                  key={n}
                  onClick={() => setSeats(n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${seats === n ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Your pickup point</label>
            <input
              type="text"
              value={pickupName}
              onChange={e => setPickupName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary-400 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Your dropoff point</label>
            <input
              type="text"
              value={dropoffName}
              onChange={e => setDropoffName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary-400 outline-none"
            />
          </div>

          <div className="bg-primary-50 rounded-xl p-3 text-sm">
            <div className="flex justify-between font-bold text-primary-700">
              <span>Total to pay</span>
              <span>₹{total * seats}</span>
            </div>
          </div>

          <Button fullWidth size="lg" loading={booking} onClick={handleBook}>
            Confirm request
          </Button>

          <p className="text-center text-xs text-gray-400">
            Payment is held securely until ride completes
          </p>
        </div>
      </Modal>
    </div>
  );
}   