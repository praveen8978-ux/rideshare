'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, TrendingUp, Car, Users, Star,
  Clock, ChevronRight, MapPin, CheckCircle, XCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { StarRating } from '@/components/ui/StarRating';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Ride {
  id: string;
  origin_name: string;
  dest_name: string;
  departure_time: string;
  status: string;
  seats_available: number;
  total_seats: number;
  base_fare: number;
  confirmed_pax: number;
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const user   = getUser();

  const [rides,   setRides]   = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({
    totalEarned: 0, totalRides: 0, avgRating: 0,
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data } = await api.get('/rides/my');
      setRides(data.rides || []);
      const completed = data.rides?.filter((r:Ride) => r.status === 'completed').length || 0;
      setStats(s => ({ ...s, totalRides: completed }));
    } catch {
      toast.error('Failed to load rides');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  const statusBadge = (status: string) => {
    const map: Record<string,any> = {
      scheduled: { label: 'Scheduled', variant: 'info' },
      active:    { label: 'Active',     variant: 'success', dot: true },
      completed: { label: 'Completed',  variant: 'default' },
      cancelled: { label: 'Cancelled',  variant: 'danger' },
    };
    return map[status] || { label: status, variant: 'default' };
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="gradient-hero">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/20">
                ←
              </button>
              <h1 className="text-white font-bold text-lg">Driver dashboard</h1>
            </div>
            <Avatar name={user?.name || 'D'} size="sm" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total earned', value: `₹${stats.totalEarned}`, icon: '💰' },
              { label: 'Rides given',  value: stats.totalRides,        icon: '🚗' },
              { label: 'Rating',       value: stats.avgRating || '—',  icon: '⭐' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4 pb-8">

        {/* Post new ride */}
        <Link href="/rides/create">
          <Card hover padding="md" className="flex items-center gap-4 border-primary-100">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Plus size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Post a new ride</p>
              <p className="text-sm text-gray-400">Share your route and earn money</p>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </Card>
        </Link>

        {/* My rides */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">My rides</h2>

          {rides.length === 0 ? (
            <Card padding="lg" className="text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Car size={24} className="text-gray-300" />
              </div>
              <p className="font-medium text-gray-700">No rides yet</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Post your first ride and start earning</p>
              <Link href="/rides/create">
                <Button size="sm" variant="secondary">Post first ride</Button>
              </Link>
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
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {ride.origin_name} → {ride.dest_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={11} />
                            <span>{formatTime(ride.departure_time)}</span>
                          </div>
                        </div>
                        <Badge label={badge.label} variant={badge.variant} dot={badge.dot} />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{ride.confirmed_pax || 0}/{ride.total_seats} booked</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">₹{ride.base_fare}</span>
                          <span>per seat</span>
                        </div>
                        <div className="ml-auto text-primary-600 font-medium">
                          ₹{Number(ride.base_fare) * Number(ride.confirmed_pax || 0)} earned
                        </div>
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