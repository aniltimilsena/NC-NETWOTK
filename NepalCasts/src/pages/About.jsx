import React from 'react';
import SEO from '../components/SEO';
import { Film, Award, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-nc-dark pt-4 pb-12 text-white">
      <SEO
        title="About Us | NepalCasts - Cinema & Talent Network"
        description="NepalCasts is Nepal's premier casting and entertainment professional discovery platform, connecting actors, models, directors, and production houses."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nepal's Premier Film & Talent Network</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Empowering the Future of <span className="text-[#00BFFF]">Nepali Cinema</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            NepalCasts bridges the gap between verified talent and visionary filmmakers. We provide a modern, transparent, and scam-free ecosystem for auditions, talent discovery, and production collaboration.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Registered Talent', value: '5,000+' },
            { label: 'Casting Calls', value: '1,200+' },
            { label: 'Verified Directors', value: '350+' },
            { label: 'Successful Matches', value: '98%' },
          ].map((stat, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-[#00BFFF]">{stat.value}</div>
              <div className="text-xs text-gray-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission & Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Film,
              title: 'Transparent Auditions',
              description: 'Direct access to verified casting notices for films, commercials, music videos, and theater across Nepal.'
            },
            {
              icon: ShieldCheck,
              title: 'Verified Profiles',
              description: 'Strict director and actor verification standards to maintain a safe, professional environment free of scams.'
            },
            {
              icon: Award,
              title: 'Industry Portfolios',
              description: 'Showcase headshots, showreels, work experience, and physical attributes in cinema-standard format.'
            }
          ].map((item, index) => (
            <div key={index} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF]">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#00BFFF]/10 via-transparent to-[#FACC15]/10 border border-white/10 text-center space-y-4">
          <h2 className="text-2xl font-black text-white">Ready to Shine or Cast Your Next Project?</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
            Join thousands of actors, models, directors, and production crew building Nepal's next generation of cinematic storytelling.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <a href="/signup" className="px-6 py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all inline-flex items-center gap-2">
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
