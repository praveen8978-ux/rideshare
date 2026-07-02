'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(ns => ns.map(n => ({ ...n, read_at: new Date().toISOString() })));
      toast.success('All marked as read');
    } catch {}
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.round(diff/60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const typeIcon: Record<string, string> = {
    push:             '🔔',
    booking_request:  '🚗',
    booking_accepted: '✅',
    booking_rejected: '❌',
    booking_cancelled:'🚫',
    ride_started:     '🟢',
    ride_completed:   '🏁',
    payment:          '💰',
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="min-h-screen bg-mist-50">
      <div className="gradient-ink noise-overlay">
        <div className="max-w-2xl mx-auto px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="w-9 h-9 glass-dark rounded-xl flex items-center justify-center text-white border border-white/10">←</button>
              <h1 className="text-white font-display font-bold text-lg tracking-tight">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} icon={<CheckCheck size={15} />} className="text-mist-300 hover:text-white">
                Mark all read
              </Button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-mist-400 text-sm ml-12">{unreadCount} unread</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-4 space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-mist-100 rounded-2xl flex items-center justify-center mb-4"><Bell size={26} className="text-mist-300" /></div>
            <p className="font-display font-semibold text-ink-800">No notifications yet</p>
            <p className="text-sm text-mist-400 mt-1">Booking updates and alerts will appear here</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`flex gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${!n.read_at ? 'bg-violet-50 border-violet-100' : 'bg-white border-mist-100'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                {typeIcon[n.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!n.read_at ? 'text-ink-900' : 'text-ink-700'}`}>{n.title}</p>
                  <span className="text-xs text-mist-400 flex-shrink-0">{formatTime(n.created_at)}</span>
                </div>
                <p className="text-xs text-mist-500 mt-0.5 leading-relaxed">{n.body}</p>
              </div>
              {!n.read_at && <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}