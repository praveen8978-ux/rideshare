'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Clock, MapPin, ChevronRight, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  ride_id: string;
  status: string;
  fare_total: number;
  seats_booked: number;
  pickup_name: string;
  dropoff_name: string;
  origin_name: string;
  dest_name: string;
  departure_time: string;
  ride_status: string;
  driver_name: string;
  driver_avatar?: string;
  make: string;
  model: string;
  color: string;
  otp?: string;
}

const STATUS_MAP: Record<string,any> = {
  pending:   { label: 'Pending',   variant: 'warning', dot: true  },
  accepted:  { label: 'Confirmed', variant: 'success', dot: true  },
  rejected:  { label: 'Rejected',  variant: 'danger'              },
  cancelled: { label: 'Cancelled', variant: 'danger'              },
  completed: { label: 'Completed', variant: 'default'             },
};

export default function BookingsPage() {
  const router  = useRouter();
  const user    = getUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      setBookings(data.bookings || []);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="gradient-hero">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.back()} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/20">←</button>
            <h1 className="text-white font-bold text-lg">My bookings</h1>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all','pending','accepted','completed','cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-white text-primary-700' : 'bg-white/20 text-white'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Package size={28} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">No bookings found</p>
            <p className="text-sm text-gray-400 mt-1">Your ride bookings will appear here</p>
          </div>
        ) : (
          filtered.map(booking => {
            const badge = STATUS_MAP[booking.status] || { label: booking.status, variant: 'default' };
            return (
              <Card
                key={booking.id}
                hover
                padding="md"
                onClick={() => router.push(`/bookings/${booking.id}`)}
              >
                {/* Driver row */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={booking.driver_name} src={booking.driver_avatar} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{booking.driver_name}</p>
                    <p className="text-xs text-gray-400">{booking.make} {booking.model} · {booking.color}</p>
                  </div>
                  <Badge label={badge.label} variant={badge.variant} dot={badge.dot} />
                </div>

                {/* Route */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                      <div className="w-0.5 h-4 bg-gray-300" />
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-gray-800 truncate">{booking.pickup_name}</p>
                      <p className="font-medium text-gray-800 truncate">{booking.dropoff_name}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={11} />
                    <span>{formatDate(booking.departure_time)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">₹{booking.fare_total}</span>
                    {booking.status === 'accepted' && booking.otp && (
                      <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-lg text-sm">
                        OTP: {booking.otp}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}