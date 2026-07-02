'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Users, Clock, MapPin, CheckCircle, XCircle,
  ChevronLeft, Phone, MessageCircle, AlertTriangle,
  Navigation, Package, IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { OtpInput } from '@/components/ui/OtpInput';
import { StarRating } from '@/components/ui/StarRating';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { getUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  passenger_id: string;
  status: string;
  seats_booked: number;
  fare_total: number;
  platform_fee: number;
  driver_payout: number;
  pickup_name: string;
  dropoff_name: string;
  segment_km: number;
  otp?: string;
  boarded_at?: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  avg_rating?: number;
}

interface Ride {
  id: string;
  origin_name: string;
  dest_name: string;
  departure_time: string;
  status: string;
  total_seats: number;
  seats_available: number;
  base_fare: number;
  route_distance_km: number;
  women_only: boolean;
  allows_parcels: boolean;
}

export default function DriverRidePage() {
  const router   = useRouter();
  const { id }   = useParams();
  const user     = getUser();

  const [ride,          setRide]          = useState<Ride | null>(null);
  const [bookings,      setBookings]      = useState<Booking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [showOtpModal,    setShowOtpModal]    = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEndModal,    setShowEndModal]    = useState(false);
  const [showRateModal,   setShowRateModal]   = useState(false);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectReason,    setRejectReason]    = useState('');
  const [otpKey,          setOtpKey]          = useState(0);
  const [rateValue,       setRateValue]       = useState(5);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadRide();
    return () => { if (socketRef.current) disconnectSocket(); };
  }, [id]);

  const loadRide = async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);
      setBookings(data.bookings || []);

      // Connect socket if ride is active
      if (data.ride.status === 'active') {
        connectToSocket(data.ride.id);
      }
    } catch {
      toast.error('Ride not found');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const connectToSocket = (rideId: string) => {
    const socket = connectSocket();
    socketRef.current = socket;
    socket.emit('driver:join_ride', { rideId });

    socket.on('booking:new_request', (data: any) => {
      toast('New booking request!', { icon: '🔔' });
      loadRide();
    });
  };

  // ── Start ride ──────────────────────────────────────────
  const handleStartRide = async () => {
    setActionLoading('start');
    try {
      await api.patch(`/rides/${id}/start`);
      toast.success('Ride started! Share your live location.');
      connectToSocket(id as string);
      setRide(r => r ? { ...r, status: 'active' } : r);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to start ride');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Accept booking ──────────────────────────────────────
  const handleAccept = async (booking: Booking) => {
    setActionLoading(booking.id);
    try {
      const { data } = await api.patch(`/bookings/${booking.id}/accept`);
      toast.success(`Booking accepted! OTP: ${data.otp}`);
      setBookings(bs => bs.map(b => b.id === booking.id ? { ...b, status: 'accepted', otp: data.otp } : b));
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to accept');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject booking ──────────────────────────────────────
  const handleReject = async () => {
    if (!selectedBooking) return;
    setActionLoading(selectedBooking.id);
    try {
      await api.patch(`/bookings/${selectedBooking.id}/reject`, { reason: rejectReason });
      toast.success('Booking rejected');
      setBookings(bs => bs.map(b => b.id === selectedBooking.id ? { ...b, status: 'rejected' } : b));
      setShowRejectModal(false);
      setRejectReason('');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Board passenger (OTP verify) ────────────────────────
  const handleBoard = async (otp: string) => {
    if (!selectedBooking) return;
    setActionLoading(selectedBooking.id);
    try {
      await api.patch(`/bookings/${selectedBooking.id}/board`, { otp });
      toast.success('Passenger boarded! ✅');
      setBookings(bs => bs.map(b => b.id === selectedBooking.id ? { ...b, boarded_at: new Date().toISOString() } : b));
      setShowOtpModal(false);
      setOtpKey(k => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Invalid OTP');
      setOtpKey(k => k + 1);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Complete ride ───────────────────────────────────────
  const handleCompleteRide = async () => {
    setActionLoading('complete');
    try {
      await api.patch(`/rides/${id}/complete`);
      const completed = bookings.filter(b => b.status === 'accepted');
      setCompletedBookings(completed);
      setRide(r => r ? { ...r, status: 'completed' } : r);
      setShowEndModal(false);
      toast.success('Ride completed! Payment released to your account.');
      if (completed.length > 0) setShowRateModal(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to complete ride');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Rate passenger ──────────────────────────────────────
  const handleRate = async (booking: Booking) => {
    try {
      await api.post('/users/rate', {
        ratedUserId: booking.passenger_id,
        bookingId:   booking.id,
        rating:      rateValue,
      });
      toast.success('Rating submitted!');
      setCompletedBookings(bs => bs.filter(b => b.id !== booking.id));
      if (completedBookings.length <= 1) {
        setShowRateModal(false);
        router.push('/driver/dashboard');
      }
    } catch {
      toast.error('Failed to submit rating');
    }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const pendingBookings  = bookings.filter(b => b.status === 'pending');
  const acceptedBookings = bookings.filter(b => b.status === 'accepted');
  const totalEarnings    = acceptedBookings.reduce((sum, b) => sum + Number(b.driver_payout), 0);

  if (loading) return <Spinner fullScreen />;
  if (!ride)   return null;

  return (
    <div className="min-h-screen bg-mist-50 pb-32">

      {/* Header */}
      <div className="gradient-ink noise-overlay relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[100px]" />
        <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => router.back()} className="w-9 h-9 glass-dark rounded-xl flex items-center justify-center text-white border border-white/10">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="text-white font-display font-bold text-lg tracking-tight">
                {ride.origin_name} → {ride.dest_name}
              </h1>
              <p className="text-mist-400 text-xs mt-0.5">{formatDate(ride.departure_time)} · {formatTime(ride.departure_time)}</p>
            </div>
            <Badge
              label={ride.status === 'scheduled' ? 'Scheduled' : ride.status === 'active' ? 'Active' : 'Completed'}
              variant={ride.status === 'active' ? 'success' : ride.status === 'completed' ? 'default' : 'info'}
              dot={ride.status === 'active'}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Passengers', value: `${acceptedBookings.length}/${ride.total_seats}`, icon: <Users size={16} /> },
              { label: 'Distance',   value: `${ride.route_distance_km} km`,                  icon: <Navigation size={16} /> },
              { label: 'Earnings',   value: `₹${totalEarnings}`,                             icon: <IndianRupee size={16} /> },
            ].map(s => (
              <div key={s.label} className="glass-dark rounded-2xl p-3.5 border border-white/10 text-center">
                <div className="text-mist-400 flex justify-center mb-1">{s.icon}</div>
                <div className="font-display font-bold text-white text-lg">{s.value}</div>
                <div className="text-mist-500 text-[11px]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 -mt-4 space-y-4">

        {/* Pending requests */}
        {pendingBookings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-warning-500 pulse-dot" />
              <h2 className="font-display font-semibold text-ink-900 tracking-tight">
                {pendingBookings.length} pending request{pendingBookings.length > 1 ? 's' : ''}
              </h2>
            </div>
            <div className="space-y-3">
              {pendingBookings.map(booking => (
                <Card key={booking.id} padding="md" className="border-warning-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={booking.name} src={booking.avatar_url} size="md" />
                    <div className="flex-1">
                      <p className="font-display font-semibold text-ink-900 tracking-tight">{booking.name}</p>
                      {booking.avg_rating && <StarRating rating={booking.avg_rating} size={12} showValue />}
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-violet-600">₹{booking.driver_payout}</p>
                      <p className="text-xs text-mist-400">you earn</p>
                    </div>
                  </div>

                  <div className="bg-mist-50 rounded-2xl p-3.5 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                        <div className="w-0.5 h-5 bg-mist-300" />
                        <div className="w-2 h-2 rounded-full bg-gold-500" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="text-xs font-medium text-ink-800">{booking.pickup_name}</p>
                          <p className="text-xs text-mist-400">Pickup</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-ink-800">{booking.dropoff_name}</p>
                          <p className="text-xs text-mist-400">Dropoff · {booking.segment_km} km</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-mist-500">
                        <p>{booking.seats_booked} seat{booking.seats_booked > 1 ? 's' : ''}</p>
                        <p className="mt-1">₹{booking.fare_total} total</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<XCircle size={16} />}
                      loading={actionLoading === booking.id}
                      onClick={() => { setSelectedBooking(booking); setShowRejectModal(true); }}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      icon={<CheckCircle size={16} />}
                      loading={actionLoading === booking.id}
                      onClick={() => handleAccept(booking)}
                    >
                      Accept
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Accepted passengers */}
        {acceptedBookings.length > 0 && (
          <div>
            <h2 className="font-display font-semibold text-ink-900 mb-3 tracking-tight">
              Confirmed passengers
            </h2>
            <div className="space-y-3">
              {acceptedBookings.map(booking => (
                <Card key={booking.id} padding="md">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={booking.name} src={booking.avatar_url} size="md" />
                    <div className="flex-1">
                      <p className="font-display font-semibold text-ink-900 tracking-tight">{booking.name}</p>
                      <p className="text-xs text-mist-400">{booking.pickup_name} → {booking.dropoff_name}</p>
                    </div>
                    {booking.boarded_at ? (
                      <Badge label="Boarded" variant="success" dot />
                    ) : (
                      <Badge label="Waiting" variant="warning" dot />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* OTP box */}
                    {booking.otp && !booking.boarded_at && (
                      <div className="flex-1 bg-violet-50 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-violet-600 font-medium">Boarding OTP</span>
                        <span className="font-mono font-bold text-violet-700 text-lg tracking-widest">{booking.otp}</span>
                      </div>
                    )}

                    {!booking.boarded_at && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setSelectedBooking(booking); setShowOtpModal(true); }}
                      >
                        Verify OTP
                      </Button>
                    )}

                    {booking.phone && (
                      <a href={`tel:${booking.phone}`} className="w-9 h-9 bg-mist-100 rounded-xl flex items-center justify-center text-mist-600 hover:bg-mist-200 transition-colors">
                        <Phone size={16} />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {bookings.length === 0 && ride.status === 'scheduled' && (
          <Card padding="lg" className="text-center">
            <div className="w-14 h-14 bg-mist-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users size={22} className="text-mist-300" />
            </div>
            <p className="font-medium text-ink-800">No booking requests yet</p>
            <p className="text-sm text-mist-400 mt-1">Passengers will appear here when they request your ride</p>
          </Card>
        )}

        {/* Earnings summary */}
        {acceptedBookings.length > 0 && (
          <Card padding="md" className="border-violet-100">
            <h3 className="font-display font-semibold text-ink-900 mb-3 tracking-tight">Earnings summary</h3>
            <div className="space-y-2 text-sm">
              {acceptedBookings.map(b => (
                <div key={b.id} className="flex justify-between text-mist-600">
                  <span>{b.name} ({b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''})</span>
                  <span className="font-medium text-ink-800">₹{b.driver_payout}</span>
                </div>
              ))}
              <div className="flex justify-between font-display font-bold text-violet-700 border-t border-mist-100 pt-2">
                <span>Total earnings</span>
                <span>₹{totalEarnings}</span>
              </div>
              <p className="text-xs text-mist-400">Released to your account after ride completes</p>
            </div>
          </Card>
        )}

        {ride.status === 'completed' && (
          <Card padding="md" className="border-success-200 bg-success-50/30 text-center">
            <div className="w-12 h-12 bg-success-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={22} className="text-success-600" />
            </div>
            <p className="font-display font-semibold text-ink-900">Ride completed</p>
            <p className="text-sm text-mist-500 mt-1">₹{totalEarnings} will be credited to your account</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => router.push('/driver/dashboard')}>
              Back to dashboard
            </Button>
          </Card>
        )}
      </div>

      {/* Bottom action bar */}
      {ride.status === 'scheduled' && (
        <div className="fixed bottom-0 inset-x-0 glass border-t border-mist-100 p-4">
          <div className="max-w-2xl mx-auto">
            <Button
              fullWidth size="lg"
              loading={actionLoading === 'start'}
              onClick={handleStartRide}
              icon={<Navigation size={18} />}
            >
              Start ride
            </Button>
          </div>
        </div>
      )}

      {ride.status === 'active' && (
        <div className="fixed bottom-0 inset-x-0 glass border-t border-mist-100 p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              fullWidth variant="outline" size="lg"
              onClick={() => router.push(`/rides/${id}/track`)}
              icon={<Navigation size={18} />}
            >
              Live tracking
            </Button>
            <Button
              fullWidth variant="danger" size="lg"
              loading={actionLoading === 'complete'}
              onClick={() => setShowEndModal(true)}
              icon={<CheckCircle size={18} />}
            >
              End ride
            </Button>
          </div>
        </div>
      )}

      {/* OTP Verify Modal */}
      <Modal open={showOtpModal} onClose={() => { setShowOtpModal(false); setOtpKey(k => k + 1); }} title="Verify boarding OTP" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-mist-500">Ask <span className="font-semibold text-ink-800">{selectedBooking?.name}</span> to show their OTP and enter it below:</p>
          <OtpInput key={otpKey} length={4} onComplete={handleBoard} disabled={!!actionLoading} />
          <p className="text-xs text-mist-400 text-center">The passenger received this OTP when you accepted their booking</p>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="Decline booking" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-mist-500">Let <span className="font-semibold text-ink-800">{selectedBooking?.name}</span> know why you're declining:</p>
          <div className="space-y-2">
            {['No space left', 'Route changed', 'Personal reasons', 'Other'].map(reason => (
              <button
                key={reason}
                onClick={() => setRejectReason(reason)}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm border transition-all ${rejectReason === reason ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-mist-200 text-ink-800 hover:border-mist-300'}`}
              >
                {reason}
              </button>
            ))}
          </div>
          <Button fullWidth variant="danger" loading={!!actionLoading} onClick={handleReject} disabled={!rejectReason}>
            Decline booking
          </Button>
        </div>
      </Modal>

      {/* End Ride Modal */}
      <Modal open={showEndModal} onClose={() => setShowEndModal(false)} title="End ride?" size="sm">
        <div className="space-y-4">
          <div className="bg-warning-50 rounded-2xl p-4 flex gap-3">
            <AlertTriangle size={18} className="text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning-800">This will complete the ride</p>
              <p className="text-xs text-warning-600 mt-1">Payment of ₹{totalEarnings} will be released to your account. Make sure all passengers have reached their destinations.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setShowEndModal(false)}>Cancel</Button>
            <Button variant="danger" loading={actionLoading === 'complete'} onClick={handleCompleteRide}>End ride</Button>
          </div>
        </div>
      </Modal>

      {/* Rate Passengers Modal */}
      <Modal open={showRateModal} onClose={() => { setShowRateModal(false); router.push('/driver/dashboard'); }} title="Rate your passengers" size="sm">
        {completedBookings.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={completedBookings[0].name} src={completedBookings[0].avatar_url} size="lg" />
              <div>
                <p className="font-display font-semibold text-ink-900">{completedBookings[0].name}</p>
                <p className="text-xs text-mist-400">{completedBookings[0].pickup_name} → {completedBookings[0].dropoff_name}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-mist-500 mb-3">How was this passenger?</p>
              <div className="flex gap-2 justify-center">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRateValue(n)}
                    className={`w-12 h-12 rounded-2xl text-xl transition-all ${n <= rateValue ? 'bg-gold-50 text-gold-500 scale-110' : 'bg-mist-100 text-mist-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-mist-500 mt-2">
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rateValue]}
              </p>
            </div>

            <Button fullWidth onClick={() => handleRate(completedBookings[0])}>
              Submit rating {completedBookings.length > 1 ? `(${completedBookings.length} left)` : ''}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}