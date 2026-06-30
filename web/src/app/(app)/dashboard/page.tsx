'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Plus, Package, Bell, Star, ChevronRight, Car, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { getUser } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
  }, []);

  if (!user) return null;
  const isDriver = user.role === 'driver' || user.role === 'both';
  const firstName = user.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-mist-50">

      {/* Top bar */}
      <header className="glass sticky top-0 z-40 border-b border-mist-100">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#B794F6" strokeWidth="2" /></svg>
            <span className="font-display font-bold text-ink-900 tracking-tight">RideShare</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative p-2.5 rounded-xl hover:bg-mist-100 transition-colors">
              <Bell size={19} className="text-mist-500" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-danger-500 rounded-full" />
            </Link>
            <button onClick={() => router.push('/profile')}>
              <Avatar name={user.name} size="sm" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-5">

        {/* Hero — dark glass card with signature route */}
        <div className="gradient-ink noise-overlay rounded-3xl p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/20 rounded-full blur-[80px]" />
          <div className="relative z-10">
            <p className="text-mist-400 text-sm mb-1 tracking-tight">{greeting}</p>
            <h1 className="font-display text-3xl font-bold text-white mb-2 tracking-tight">{firstName}</h1>
            <p className="text-mist-400 text-sm mb-5">Where are you heading today?</p>

            <Link href="/rides/search" className="flex items-center gap-3 glass-dark rounded-2xl p-4 hover:bg-white/[0.08] transition-colors group">
              <Search size={18} className="text-mist-400 group-hover:text-violet-300 transition-colors" />
              <span className="text-mist-300 text-sm">Search for a ride...</span>
              <ChevronRight size={16} className="ml-auto text-mist-500" />
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/rides/search">
            <Card hover padding="md" className="flex flex-col gap-3.5">
              <div className="w-11 h-11 bg-violet-50 rounded-2xl flex items-center justify-center">
                <Search size={20} className="text-violet-600" />
              </div>
              <div>
                <div className="font-display font-semibold text-ink-900 tracking-tight">Find a ride</div>
                <div className="text-xs text-mist-400 mt-0.5">Search available routes</div>
              </div>
            </Card>
          </Link>
          <Link href="/rides/create">
            <Card hover padding="md" className="flex flex-col gap-3.5">
              <div className="w-11 h-11 bg-success-50 rounded-2xl flex items-center justify-center">
                <Plus size={20} className="text-success-600" />
              </div>
              <div>
                <div className="font-display font-semibold text-ink-900 tracking-tight">Offer a ride</div>
                <div className="text-xs text-mist-400 mt-0.5">Post your route & earn</div>
              </div>
            </Card>
          </Link>
        </div>

        {/* My bookings */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink-900 tracking-tight">My bookings</h2>
            <Link href="/bookings" className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex flex-col items-center py-9 text-center">
            <div className="w-14 h-14 bg-mist-100 rounded-2xl flex items-center justify-center mb-3">
              <Car size={22} className="text-mist-400" />
            </div>
            <p className="font-medium text-ink-800">No rides yet</p>
            <p className="text-sm text-mist-400 mt-1">Your upcoming rides will appear here</p>
            <Link href="/rides/search">
              <Button size="sm" variant="secondary" className="mt-4">Find your first ride</Button>
            </Link>
          </div>
        </Card>

        {/* Driver section */}
        {isDriver && (
          <Card padding="md" className="border-violet-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-violet-50 rounded-2xl flex items-center justify-center">
                <TrendingUp size={20} className="text-violet-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-ink-900 tracking-tight">Driver dashboard</h2>
                <p className="text-xs text-mist-400">Your earnings & rides</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total earned', value: '₹0' },
                { label: 'Rides given',  value: '0'  },
                { label: 'Rating',       value: '—'  },
              ].map(s => (
                <div key={s.label} className="bg-mist-50 rounded-2xl p-3.5 text-center">
                  <div className="font-display font-bold text-ink-900 text-lg">{s.value}</div>
                  <div className="text-[11px] text-mist-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <Link href="/driver/dashboard">
              <Button fullWidth variant="secondary" size="sm">Go to driver dashboard</Button>
            </Link>
          </Card>
        )}

        <div className="h-20" />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 glass border-t border-mist-100 z-40">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-around">
          {[
            { href: '/dashboard',    icon: <Search size={20}  />, label: 'Home',    active: true  },
            { href: '/rides/search', icon: <Search size={20}  />, label: 'Search',  active: false },
            { href: '/bookings',     icon: <Package size={20} />, label: 'Trips',   active: false },
            { href: '/profile',      icon: <Star size={20}    />, label: 'Profile', active: false },
          ].map(n => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${n.active ? 'text-violet-600' : 'text-mist-400 hover:text-ink-700'}`}>
              {n.icon}
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}