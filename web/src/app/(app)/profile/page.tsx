'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Car, Star, LogOut, ChevronRight, Shield, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StarRating } from '@/components/ui/StarRating';
import { useAuthStore } from '@/store/authStore';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ProfilePage() {
  const router   = useRouter();
  const { logout, setUser } = useAuthStore();
  const [profile,  setProfile]  = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [pRes, vRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/vehicles'),
      ]);
      setProfile(pRes.data.user);
      setVehicles(vRes.data.vehicles || []);
      setUser(pRes.data.user);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) return <Spinner fullScreen />;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="gradient-hero">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-10">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => router.back()} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/20">←</button>
            <h1 className="text-white font-bold text-lg">My Profile</h1>
            <div className="w-9" />
          </div>

          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center">
            <Avatar name={profile.name} src={profile.avatar_url} size="xl" />
            <h2 className="text-2xl font-bold text-white mt-4">{profile.name}</h2>
            <p className="text-white/60 text-sm mt-1">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                label={profile.role === 'both' ? 'Driver & Rider' : profile.role}
                variant="default"
              />
              {profile.aadhaar_verified === 'verified' && (
                <Badge label="Verified" variant="success" dot />
              )}
            </div>
            {Number(profile.avg_rating) > 0 && (
              <div className="mt-2">
                <StarRating rating={Number(profile.avg_rating)} showValue count={Number(profile.total_ratings)} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">

        {/* Account info */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Account info</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Full name</p>
                <p className="text-sm font-medium text-gray-800">{profile.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
                <Mail size={16} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-800">{profile.email || '—'}</p>
              </div>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Phone size={16} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="text-sm font-medium text-gray-800">{profile.phone}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Vehicles */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500">My vehicles</h3>
            <Link href="/rides/create" className="text-xs text-primary-600 font-medium">+ Add vehicle</Link>
          </div>
          {vehicles.length === 0 ? (
            <div className="text-center py-6">
              <Car size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No vehicles added yet</p>
              <Link href="/rides/create">
                <Button size="sm" variant="secondary" className="mt-3">Add vehicle</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {vehicles.map(v => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Car size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{v.make} {v.model}</p>
                    <p className="text-xs text-gray-400">{v.color} · {v.plate_number} · {v.total_seats} seats</p>
                  </div>
                  {v.ac_available && <Badge label="AC" variant="info" size="sm" />}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Settings */}
        <Card padding="none">
          {[
            { icon: <Shield size={16} className="text-green-600" />, label: 'Verification & safety', bg: 'bg-green-50', href: '#' },
            { icon: <Star size={16} className="text-amber-600" />,   label: 'My ratings & reviews',  bg: 'bg-amber-50',  href: '#' },
            { icon: <Car size={16} className="text-blue-600" />,     label: 'Driver dashboard',       bg: 'bg-blue-50',   href: '/driver/dashboard' },
          ].map((item, i) => (
            <Link key={i} href={item.href}>
              <div className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-gray-800 flex-1">{item.label}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </Card>

        {/* Logout */}
        <Button
          fullWidth
          variant="danger"
          size="lg"
          onClick={handleLogout}
          icon={<LogOut size={18} />}
        >
          Log out
        </Button>

        <p className="text-center text-xs text-gray-400 pb-4">
          RideShare v1.0.0 · Built for India 🇮🇳
        </p>
      </div>
    </div>
  );
}