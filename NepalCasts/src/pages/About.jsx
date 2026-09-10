import React from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Film, Award, ShieldCheck, Sparkles, ArrowRight, ChevronLeft, Users, Clapperboard, CheckCircle2 } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#141414] pt-4 pb-16 text-white text-left">
      <SEO
        title="About Us | NepalCasts - Cinema & Talent Network"
        description="NepalCasts is Nepal's premier casting and entertainment professional discovery platform, connecting actors, models, directors, and production houses."
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
        {/* Navigation Bar */}
        <div className="flex items-center pt-2">
          <button
            onClick={() => navigate(-1)}
            type="button"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-white" />
            <span>Nepal's Premier Film & Talent Network</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-white leading-tight">
            Empowering the Future of <span className="text-[#522C69]">Nepali Cinema</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
            NepalCasts bridges the gap between verified talent and visionary filmmakers. We provide a modern, transparent, and scam-free ecosystem for auditions, talent discovery, and production collaboration.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Registered Talent', value: '5,000+', icon: Users },
            { label: 'Casting Calls', value: '1,200+', icon: Clapperboard },
            { label: 'Verified Directors', value: '350+', icon: CheckCircle2 },
            { label: 'Successful Matches', value: '98%', icon: Award },
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#181818] text-center space-y-2 shadow-lg flex flex-col items-center justify-center">
              <stat.icon className="w-6 h-6 text-white mb-1" />
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-400 font-medium">{stat.label}</div>
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
            <div key={index} className="p-7 rounded-2xl bg-[#181818] space-y-4 shadow-lg hover:bg-[#1c1c1c] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="p-8 sm:p-10 rounded-2xl bg-[#181818] text-center space-y-4 shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Ready to Shine or Cast Your Next Project?</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
            Join thousands of actors, models, directors, and production crew building Nepal's next generation of cinematic storytelling.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => navigate('/talents')}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
            >
              <span>Explore Talents</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

