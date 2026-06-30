'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OtpInput } from '@/components/ui/OtpInput';
import api from '@/lib/api';
import { setTokens, setUser as saveUser } from '@/lib/auth';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'name';

export default function LoginPage() {
  const router = useRouter();

  const [step,   setStep]   = useState<Step>('email');
  const [email,  setEmail]  = useState('');
  const [otp,    setOtp]    = useState('');
  const [name,   setName]   = useState('');
  const [busy,   setBusy]   = useState(false);
  const [otpKey, setOtpKey] = useState(0);

  const handleSendOtp = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      toast.success('OTP sent to your email');
      setOtp('');
      setOtpKey(k => k + 1);
      setStep('otp');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setOtp(code);
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp:   code,
      });
      if (data.requiresName) { setStep('name'); return; }
      setTokens(data.token, data.refreshToken);
      saveUser(data.user);
      toast.success('Welcome back');
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Invalid OTP');
      setOtpKey(k => k + 1);
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
        email: email.trim().toLowerCase(),
        otp,
        name:  name.trim(),
      });
      setTokens(data.token, data.refreshToken);
      saveUser(data.user);
      toast.success('Welcome to RideShare');
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel: dark, signature route line ── */}
      <div className="hidden lg:flex lg:w-1/2 gradient-ink noise-overlay relative flex-col items-center justify-center p-12 overflow-hidden">

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-400/10 rounded-full blur-[100px]" />

        <div className="relative max-w-md text-center z-10">

          {/* Signature: animated route */}
          <div className="mb-10 flex items-center justify-center gap-3">
            <div className="w-3 h-3 rounded-full bg-violet-300 route-dot-pulse" />
            <svg width="120" height="2" className="overflow-visible">
              <line x1="0" y1="1" x2="120" y2="1" stroke="#7C5CFF" strokeWidth="2" className="route-travel" opacity="0.6" />
            </svg>
            <div className="w-3 h-3 rounded-full bg-violet-500" style={{ boxShadow: '0 0 20px rgba(124,92,255,0.8)' }} />
          </div>

          <h1 className="font-display text-5xl font-bold text-white mb-5 tracking-tight text-glow">
            RideShare
          </h1>
          <p className="text-mist-300 text-lg leading-relaxed font-light">
            India's route-intelligent mobility network.
            Travel together, split the cost, arrive on time.
          </p>

          <div className="mt-14 grid grid-cols-3 gap-4">
            {[
              { v: '10K+', l: 'Riders' },
              { v: '₹85',  l: 'Avg. saved' },
              { v: '4.9',  l: 'Rating' },
            ].map(s => (
              <div key={s.l} className="glass-dark rounded-2xl p-4 border border-white/[0.06]">
                <div className="font-display text-2xl font-bold text-white">{s.v}</div>
                <div className="text-mist-400 text-[11px] mt-1 tracking-wide uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 gradient-mesh">
        <div className="w-full max-w-md">

          {/* Mobile signature */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <svg width="32" height="2"><line x1="0" y1="1" x2="32" y2="1" stroke="#B794F6" strokeWidth="2" /></svg>
            <span className="font-display font-bold text-ink-900 text-xl tracking-tight">RideShare</span>
          </div>

          <div className="glass-card rounded-3xl shadow-glass-lg p-9 fade-in">

            {step === 'email' && (
              <>
                <div className="w-12 h-12 gradient-violet rounded-2xl flex items-center justify-center mb-6 shadow-violet">
                  <Mail size={20} className="text-white" />
                </div>
                <h2 className="font-display text-[26px] font-bold text-ink-900 mb-1.5 tracking-tight">Welcome</h2>
                <p className="text-mist-500 mb-8 text-[15px]">Enter your email address to continue</p>

                <div className="space-y-4">
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    icon={<Mail size={16} />}
                    hint="We'll send a 6-digit code to this email"
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    autoFocus
                  />
                  <Button fullWidth size="lg" loading={busy} onClick={handleSendOtp} icon={<ArrowRight size={18} />}>
                    Send code
                  </Button>
                </div>

                <p className="text-center text-xs text-mist-400 mt-7 leading-relaxed">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-violet-600 hover:underline">Terms</a>
                  {' '}and{' '}
                  <a href="#" className="text-violet-600 hover:underline">Privacy Policy</a>
                </p>
              </>
            )}

            {step === 'otp' && (
              <>
                <button onClick={() => setStep('email')} className="flex items-center gap-1 text-mist-400 hover:text-ink-700 mb-7 text-sm transition-colors">
                  <ChevronLeft size={16} /> Back
                </button>
                <h2 className="font-display text-[26px] font-bold text-ink-900 mb-1.5 tracking-tight">Check your inbox</h2>
                <p className="text-mist-500 mb-1 text-[15px]">
                  Code sent to <span className="font-semibold text-ink-800">{email}</span>
                </p>
                <p className="text-xs text-mist-400 mb-8">Also check spam · expires in 5 minutes</p>

                <OtpInput key={otpKey} onComplete={handleVerifyOtp} disabled={busy} />

                {busy && <p className="text-center text-sm text-violet-500 mt-5 animate-pulse">Verifying...</p>}

                <p className="text-center text-sm text-mist-400 mt-7">
                  Didn't receive it?{' '}
                  <button onClick={handleSendOtp} disabled={busy} className="text-violet-600 hover:underline font-medium disabled:opacity-50">
                    Resend code
                  </button>
                </p>
              </>
            )}

            {step === 'name' && (
              <>
                <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-2xl">👋</span>
                </div>
                <h2 className="font-display text-[26px] font-bold text-ink-900 mb-1.5 tracking-tight">Almost there</h2>
                <p className="text-mist-500 mb-8 text-[15px]">Tell us your name to complete registration</p>

                <div className="space-y-4">
                  <Input
                    label="Full name"
                    placeholder="Praveen Beeram"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    hint="Use your real name — it builds trust with co-riders"
                    autoFocus
                  />
                  <Button fullWidth size="lg" loading={busy} onClick={handleRegister}>
                    Create account
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