'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Plus, Package, Bell, Star, ChevronRight, Car, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { getUser } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
  }, []);

  if (!user) return null;

  const isDriver = user.role === 'driver' || user.role === 'both';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center">
              <MapPin size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">RideShare</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <button onClick={() => router.push('/profile')}>
              <Avatar name={user.name} size="sm" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Welcome */}
        <div className="gradient-hero rounded-2xl p-6 text-white">
          <p className="text-white/60 text-sm mb-1">Good morning 👋</p>
          <h1 className="text-2xl font-bold mb-1">{user.name.split(' ')[0]}</h1>
          <p className="text-white/60 text-sm">Where are you heading today?</p>
          <Link href="/rides/search" className="mt-4 flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 hover:bg-white/20 transition-colors">
            <Search size={18} className="text-white/60" />
            <span className="text-white/60 text-sm">Search for a ride...</span>
          </Link>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/rides/search">
            <Card hover padding="md" className="flex flex-col gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Search size={20} className="text-primary-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Find a ride</div>
                <div className="text-xs text-gray-400 mt-0.5">Search available routes</div>
              </div>
            </Card>
          </Link>
          <Link href="/rides/create">
            <Card hover padding="md" className="flex flex-col gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Plus size={20} className="text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Offer a ride</div>
                <div className="text-xs text-gray-400 mt-0.5">Post your route & earn</div>
              </div>
            </Card>
          </Link>
        </div>

        {/* My bookings */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">My bookings</h2>
            <Link href="/bookings" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <Car size={24} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">No rides yet</p>
            <p className="text-sm text-gray-400 mt-1">Your upcoming rides will appear here</p>
            <Link href="/rides/search">
              <Button size="sm" variant="secondary" className="mt-4">
                Find your first ride
              </Button>
            </Link>
          </div>
        </Card>

        {/* Driver section */}
        {isDriver && (
          <Card padding="md" className="border-primary-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Driver dashboard</h2>
                <p className="text-xs text-gray-400">Your earnings & rides</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total earned', value: '₹0' },
                { label: 'Rides given', value: '0' },
                { label: 'Rating', value: '—' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="font-bold text-gray-900 text-lg">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <Link href="/driver/dashboard">
              <Button fullWidth variant="secondary" size="sm">
                Go to driver dashboard
              </Button>
            </Link>
          </Card>
        )}

        {/* Bottom nav */}
        <div className="h-20" />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-around">
          {[
            { href: '/dashboard',     icon: <MapPin size={22} />,    label: 'Home',     active: true  },
            { href: '/rides/search',  icon: <Search size={22} />,    label: 'Search',   active: false },
            { href: '/bookings',      icon: <Package size={22} />,   label: 'Trips',    active: false },
            { href: '/profile',       icon: <Star size={22} />,      label: 'Profile',  active: false },
          ].map(n => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${n.active ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {n.icon}
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}