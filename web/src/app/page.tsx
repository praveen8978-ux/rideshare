import Link from 'next/link';
import { Shield, Zap, Users, ArrowRight, MapPin } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-mist-50">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <svg width="22" height="2"><line x1="0" y1="1" x2="22" y2="1" stroke="#B794F6" strokeWidth="2" /></svg>
            <span className="font-display font-bold text-ink-900 text-lg tracking-tight">RideShare</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-mist-600 hover:text-ink-900 transition-colors">Sign in</Link>
            <Link href="/login" className="bg-ink-900 hover:bg-ink-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-ink noise-overlay min-h-screen flex items-center justify-center px-6 pt-16 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-400/10 rounded-full blur-[120px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 glass-dark border border-white/10 rounded-full px-4 py-2 mb-9">
            <span className="w-1.5 h-1.5 bg-success-500 rounded-full pulse-dot" />
            <span className="text-mist-300 text-[13px] font-medium tracking-tight">Live rides matching near you</span>
          </div>

          {/* Signature route element */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-3 h-3 rounded-full bg-violet-300 route-dot-pulse" />
            <svg width="180" height="2" className="overflow-visible">
              <line x1="0" y1="1" x2="180" y2="1" stroke="#7C5CFF" strokeWidth="2" className="route-travel" opacity="0.5" />
            </svg>
            <div className="w-3 h-3 rounded-full bg-violet-500" style={{ boxShadow: '0 0 24px rgba(124,92,255,0.9)' }} />
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-bold text-white mb-7 leading-[0.95] tracking-tight">
            Share the route,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-violet-200 to-mist-200 text-glow">
              split the fare
            </span>
          </h1>

          <p className="text-xl text-mist-300 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            India's route-intelligent ride sharing network. Match with drivers
            going your way — not just your exact destination.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white text-ink-900 font-semibold px-9 py-4 rounded-2xl text-[15px] hover:shadow-glass-lg hover:-translate-y-0.5 transition-all">
              Find a ride <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 glass-dark border border-white/10 text-white font-semibold px-9 py-4 rounded-2xl text-[15px] hover:bg-white/[0.08] transition-all">
              Offer a ride
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-24 max-w-lg mx-auto">
            {[
              { value: '10K+', label: 'Riders' },
              { value: '₹85',  label: 'Avg. saved/trip' },
              { value: '4.9',  label: 'App rating' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-bold text-white">{s.value}</div>
                <div className="text-mist-500 text-[11px] mt-1.5 tracking-wide uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-18">
            <p className="text-violet-600 text-sm font-semibold tracking-wide uppercase mb-3">Why RideShare</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4 tracking-tight">Built for trust, designed for India</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <MapPin size={22} className="text-violet-600" />, title: 'Route matching', desc: 'Match on route overlap, not just destination. 10× more rides surfaced.', bg: 'bg-violet-50' },
              { icon: <Shield size={22} className="text-success-600" />, title: 'Women safety mode', desc: 'Verified rides, SOS alerts, live location sharing with trusted contacts.', bg: 'bg-success-50' },
              { icon: <Zap size={22} className="text-gold-500" />, title: 'AI fare engine', desc: 'Dynamic pricing from distance, fuel cost, and demand. Always fair.', bg: 'bg-amber-50' },
              { icon: <Users size={22} className="text-violet-600" />, title: 'College network', desc: 'Dedicated pools for VIT, SRM, IITs, NITs. Travel with your community.', bg: 'bg-violet-50' },
            ].map(f => (
              <div key={f.title} className="p-7 rounded-3xl border border-mist-100 card-hover bg-white">
                <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-5`}>{f.icon}</div>
                <h3 className="font-display font-semibold text-ink-900 mb-2 tracking-tight">{f.title}</h3>
                <p className="text-mist-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-28 px-6 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-18">
            <p className="text-violet-600 text-sm font-semibold tracking-wide uppercase mb-3">The flow</p>
            <h2 className="font-display text-4xl font-bold text-ink-900 tracking-tight">Three steps to your ride</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: 'Post or find a ride', desc: 'Driver posts their route. Passenger searches by pickup and dropoff location.' },
              { title: 'Match & confirm',     desc: 'System matches on route overlap. Driver accepts, passenger pays securely.' },
              { title: 'Ride & arrive',       desc: 'Verify with OTP at pickup. Driver earns, passenger saves — everyone wins.' },
            ].map((s, i) => (
              <div key={s.title} className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center font-display font-bold text-violet-300 text-sm">
                    {i + 1}
                  </div>
                  {i < 2 && <div className="hidden md:block flex-1 h-px bg-mist-200" />}
                </div>
                <h3 className="font-display font-semibold text-ink-900 text-lg mb-2 tracking-tight">{s.title}</h3>
                <p className="text-mist-500 leading-relaxed text-[15px]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 gradient-ink noise-overlay relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-96 bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">Ready to ride smarter?</h2>
          <p className="text-mist-300 text-lg mb-10 font-light">Join thousands of students and professionals saving money every day.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-ink-900 font-bold px-9 py-4 rounded-2xl text-[15px] hover:shadow-glass-lg hover:-translate-y-1 transition-all">
            Get started free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink-950 text-white py-14 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <svg width="18" height="2"><line x1="0" y1="1" x2="18" y2="1" stroke="#B794F6" strokeWidth="2" /></svg>
            <span className="font-display font-bold tracking-tight">RideShare</span>
          </div>
          <p className="text-mist-500 text-sm">© 2024 RideShare · Built for India 🇮🇳</p>
          <div className="flex gap-6 text-sm text-mist-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}