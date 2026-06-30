'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Car, Users, Clock, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Ride {
  id: string; origin_name: string; dest_name: string; departure_time: string;
  status: string; seats_available: number; total_seats: number; base_fare: number; confirmed_pax: number;
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const user   = getUser();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalEarned: 0, totalRides: 0, avgRating: 0 });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/rides/my');
      setRides(data.rides || []);
      const completed = data.rides?.filter((r: Ride) => r.status === 'completed').length || 0;
      setStats(s => ({ ...s, totalRides: completed }));
    } catch { toast.error('Failed to load rides'); }
    finally { setLoading(false); }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

  const statusBadge = (status: string) => {
    const map: Record<string, any> = {
      scheduled: { label: 'Scheduled', variant: 'info' },
      active:    { label: 'Active', variant: 'success', dot: true },
      completed: { label: 'Completed', variant: 'default' },
      cancelled: { label: 'Cancelled', variant: 'danger' },
    };
    return map[status] || { label: status, variant: 'default' };
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="min-h-screen bg-mist-50">

      <div className="gradient-ink noise-overlay relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="max-w-2xl mx-auto px-5 pt-5 pb-9 relative z-10">
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="w-9 h-9 glass-dark rounded-xl flex items-center justify-center text-white border border-white/10">←</button>
              <h1 className="text-white font-display font-bold text-lg tracking-tight">Driver dashboard</h1>
            </div>
            <Avatar name={user?.name || 'D'} size="sm" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total earned', value: `₹${stats.totalEarned}`, icon: '💰' },
              { label: 'Rides given',  value: stats.totalRides, icon: '🚗' },
              { label: 'Rating',       value: stats.avgRating || '—', icon: '⭐' },
            ].map(s => (
              <div key={s.label} className="glass-dark rounded-2xl p-4 border border-white/10 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="font-display text-xl font-bold text-white">{s.value}</div>
                <div className="text-mist-400 text-[11px] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 -mt-5 space-y-4 pb-8">

        <Link href="/rides/create">
          <Card hover padding="md" className="flex items-center gap-4 border-violet-100">
            <div className="w-12 h-12 gradient-violet rounded-2xl flex items-center justify-center flex-shrink-0 shadow-violet">
              <Plus size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-ink-900 tracking-tight">Post a new ride</p>
              <p className="text-sm text-mist-400">Share your route and earn money</p>
            </div>
            <ChevronRight size={18} className="text-mist-300" />
          </Card>
        </Link>

        <div>
          <h2 className="font-display font-semibold text-ink-900 mb-3 tracking-tight">My rides</h2>

          {rides.length === 0 ? (
            <Card padding="lg" className="text-center">
              <div className="w-14 h-14 bg-mist-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><Car size={22} className="text-mist-300" /></div>
              <p className="font-medium text-ink-800">No rides yet</p>
              <p className="text-sm text-mist-400 mt-1 mb-4">Post your first ride and start earning</p>
              <Link href="/rides/create"><Button size="sm" variant="secondary">Post first ride</Button></Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {rides.map(ride => {
                const badge = statusBadge(ride.status);
                return (
                  <Link key={ride.id} href={`/driver/ride/${ride.id}`}>
                    <Card hover padding="md">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-display font-semibold text-ink-900 text-sm tracking-tight">{ride.origin_name} → {ride.dest_name}</p>
                          <div className="flex items-center gap-1 text-xs text-mist-400 mt-1"><Clock size={11} /><span>{formatTime(ride.departure_time)}</span></div>
                        </div>
                        <Badge label={badge.label} variant={badge.variant} dot={badge.dot} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-mist-500">
                        <div className="flex items-center gap-1"><Users size={12} /><span>{ride.confirmed_pax || 0}/{ride.total_seats} booked</span></div>
                        <div className="flex items-center gap-1"><span className="font-medium text-ink-700">₹{ride.base_fare}</span><span>per seat</span></div>
                        <div className="ml-auto font-display font-semibold text-violet-600">₹{Number(ride.base_fare) * Number(ride.confirmed_pax || 0)} earned</div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}