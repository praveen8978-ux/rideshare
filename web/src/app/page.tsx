import Link from 'next/link';
import { MapPin, Shield, Zap, Users, ArrowRight, Star } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <MapPin size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">RideShare</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/login" className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full pulse-dot" />
            <span className="text-white/90 text-sm font-medium">Live rides available near you</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Share the ride,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
              split the cost
            </span>
          </h1>

          <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            India's smartest route-based ride sharing platform. Match with drivers going your way — not just your destination.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold px-8 py-4 rounded-2xl text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Find a ride <ArrowRight size={20} />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-white/20 transition-all">
              Offer a ride
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-lg mx-auto">
            {[
              { value: '10K+', label: 'Happy riders' },
              { value: '₹85', label: 'Avg savings/trip' },
              { value: '4.9★', label: 'App rating' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-white/50 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why RideShare?</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Built for India, designed for trust, powered by smart technology</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <MapPin className="text-primary-600" size={24} />,
                title: 'Route matching',
                desc: 'Match on route overlap, not just destination. 10× more rides available.',
                color: 'bg-primary-50',
              },
              {
                icon: <Shield className="text-green-600" size={24} />,
                title: 'Women safety mode',
                desc: 'Verified rides, SOS button, live location sharing with trusted contacts.',
                color: 'bg-green-50',
              },
              {
                icon: <Zap className="text-amber-600" size={24} />,
                title: 'AI fare engine',
                desc: 'Dynamic pricing based on distance, fuel cost, and demand. Always fair.',
                color: 'bg-amber-50',
              },
              {
                icon: <Users className="text-purple-600" size={24} />,
                title: 'College network',
                desc: 'Special pools for VIT, SRM, IITs, NITs. Travel with your community.',
                color: 'bg-purple-50',
              },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 card-hover">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How it works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Post or find a ride', desc: 'Driver posts their route. Passenger searches by pickup and dropoff location.' },
              { step: '02', title: 'Match & confirm', desc: 'System matches on route overlap. Driver accepts request. Passenger pays securely.' },
              { step: '03', title: 'Ride & earn', desc: 'Show OTP at pickup. Ride together. Driver earns, passenger saves. Everyone wins.' },
            ].map(s => (
              <div key={s.step} className="relative">
                <div className="text-6xl font-black text-primary-100 mb-4">{s.step}</div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 gradient-primary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to ride smarter?</h2>
          <p className="text-white/70 text-lg mb-8">Join thousands of students and professionals saving money every day.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-2xl text-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            Get started free <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 gradient-primary rounded-lg flex items-center justify-center">
              <MapPin size={14} className="text-white" />
            </div>
            <span className="font-bold">RideShare</span>
          </div>
          <p className="text-gray-500 text-sm">© 2024 RideShare. Built for India 🇮🇳</p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}