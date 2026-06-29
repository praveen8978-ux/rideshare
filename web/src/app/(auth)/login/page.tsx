'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, ArrowRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OtpInput } from '@/components/ui/OtpInput';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { setTokens, setUser as saveUser } from '@/lib/auth';
import toast from 'react-hot-toast';

type Step = 'phone' | 'otp' | 'name';

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, loading } = useAuthStore();

  const [step,    setStep]    = useState<Step>('phone');
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [name,    setName]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [otpKey,  setOtpKey]  = useState(0);

  const handleSendOtp = async () => {
    const formatted = phone.startsWith('+91') ? phone : `+91${phone}`;
    if (!/^\+91[6-9]\d{9}$/.test(formatted)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    try {
      await sendOtp(formatted);
      toast.success('OTP sent!');
      setPhone(formatted);
      setOtp('');
      setOtpKey(k => k + 1); // reset OTP boxes
      setStep('otp');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setOtp(code);
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp: code });

      if (data.requiresName) {
        // New user — go to name step, OTP still valid in Redis
        setStep('name');
        return;
      }

      // Existing user — logged in
      setTokens(data.token, data.refreshToken);
      saveUser(data.user);
      toast.success('Welcome back! 👋');
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Invalid OTP');
      setOtpKey(k => k + 1); // reset boxes on error
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Enter your full name');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        phone,
        otp,
        name: name.trim(),
      });
      setTokens(data.token, data.refreshToken);
      saveUser(data.user);
      toast.success('Welcome to RideShare! 🎉');
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20">
            <MapPin size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">RideShare</h1>
          <p className="text-white/70 text-lg leading-relaxed">
            India's smartest route-based ride sharing platform.
            Travel together, save money, make friends.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { v: '10K+', l: 'Riders' },
              { v: '₹85',  l: 'Avg savings' },
              { v: '4.9★', l: 'Rating' },
            ].map(s => (
              <div key={s.l} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">{s.v}</div>
                <div className="text-white/50 text-xs mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Logo (mobile only) */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">RideShare</span>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 fade-in">

            {/* Step: phone */}
            {step === 'phone' && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h2>
                <p className="text-gray-500 mb-8">Enter your mobile number to continue</p>
                <div className="space-y-4">
                  <Input
                    label="Mobile number"
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    icon={<Phone size={16} />}
                    hint="We'll send you a 6-digit OTP"
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  />
                  <Button
                    fullWidth size="lg"
                    loading={loading}
                    onClick={handleSendOtp}
                    icon={<ArrowRight size={18} />}
                  >
                    Send OTP
                  </Button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-6">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-primary-600 hover:underline">Terms</a> and{' '}
                  <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
                </p>
              </>
            )}

            {/* Step: OTP */}
            {step === 'otp' && (
              <>
                <button
                  onClick={() => setStep('phone')}
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 mb-6 text-sm transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter OTP</h2>
                <p className="text-gray-500 mb-8">
                  Sent to <span className="font-medium text-gray-700">{phone}</span>
                </p>
                <OtpInput
                  key={otpKey}
                  onComplete={handleVerifyOtp}
                  disabled={busy}
                />
                {busy && (
                  <p className="text-center text-sm text-primary-500 mt-4 animate-pulse">
                    Verifying...
                  </p>
                )}
                <p className="text-center text-sm text-gray-400 mt-6">
                  Didn't receive it?{' '}
                  <button
                    onClick={handleSendOtp}
                    className="text-primary-600 hover:underline font-medium"
                  >
                    Resend OTP
                  </button>
                </p>
              </>
            )}

            {/* Step: Name (new user) */}
            {step === 'name' && (
              <>
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-2xl">👋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Almost there!</h2>
                <p className="text-gray-500 mb-8">Tell us your name to create your account</p>
                <div className="space-y-4">
                  <Input
                    label="Full name"
                    placeholder="Praveena Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    hint="Use your real name — it builds trust with co-riders"
                    autoFocus
                  />
                  <Button
                    fullWidth size="lg"
                    loading={busy}
                    onClick={handleRegister}
                  >
                    Create account 🎉
                  </Button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}