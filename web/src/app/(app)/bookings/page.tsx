'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronRight, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Booking {
  id: string; ride_id: string; status: string; fare_total: number; seats_booked: number;
  pickup_name: string; dropoff_name: string; departure_time: string;
  driver_name: string; driver_avatar?: string; make: string; model: string; color: string; otp?: string;
}

const STATUS_MAP: Record<string, any> = {
  pending:   { label: 'Pending',   variant: 'warning', dot: true },
  accepted:  { label: 'Confirmed', variant: 'success', dot: true },
  rejected:  { label: 'Rejected',  variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  completed: { label: 'Completed', variant: 'default' },
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data } = await api.get('/bookings/my');
      setBookings(data.bookings || []);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const formatDate = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="min-h-screen bg-mist-50">
      <div className="gradient-ink noise-overlay">
        <div className="max-w-2xl mx-auto px-5 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => router.back()} className="w-9 h-9 glass-dark rounded-xl flex items-center justify-center text-white border border-white/10">←</button>
            <h1 className="text-white font-display font-bold text-lg tracking-tight">My bookings</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all','pending','accepted','completed','cancelled'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-white text-ink-900' : 'glass-dark text-mist-300'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-mist-100 rounded-2xl flex items-center justify-center mb-4"><Package size={26} className="text-mist-300" /></div>
            <p className="font-display font-semibold text-ink-800">No bookings found</p>
            <p className="text-sm text-mist-400 mt-1">Your ride bookings will appear here</p>
          </div>
        ) : (
          filtered.map(booking => {
            const badge = STATUS_MAP[booking.status] || { label: booking.status, variant: 'default' };
            return (
              <Card key={booking.id} hover padding="md" onClick={() => router.push(`/bookings/${booking.id}`)}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={booking.driver_name} src={booking.driver_avatar} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-display font-semibold text-ink-900">{booking.driver_name}</p>
                    <p className="text-xs text-mist-400">{booking.make} {booking.model} · {booking.color}</p>
                  </div>
                  <Badge label={badge.label} variant={badge.variant} dot={badge.dot} />
                </div>

                <div className="bg-mist-50 rounded-2xl p-3.5 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      <div className="w-0.5 h-4 bg-mist-300" />
                      <div className="w-2 h-2 rounded-full bg-gold-500" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-ink-800 truncate">{booking.pickup_name}</p>
                      <p className="font-medium text-ink-800 truncate">{booking.dropoff_name}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-mist-500">
                  <div className="flex items-center gap-1"><Clock size={11} /><span>{formatDate(booking.departure_time)}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-ink-900">₹{booking.fare_total}</span>
                    {booking.status === 'accepted' && booking.otp && (
                      <span className="bg-success-50 text-success-700 font-mono font-bold px-2.5 py-0.5 rounded-lg text-sm">{booking.otp}</span>
                    )}
                    <ChevronRight size={14} className="text-mist-300" />
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