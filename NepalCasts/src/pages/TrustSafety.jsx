import React from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { ShieldCheck, AlertTriangle, MapPin, MessageSquare, Lock, CheckCircle2, Building2, FileCheck, ShieldAlert, Sparkles, ChevronLeft } from 'lucide-react';

export default function TrustSafety() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#141414] pt-4 pb-16 text-white text-left">
      <SEO
        title="Trust & Safety Center | NepalCasts - Cinema & Talent Network"
        description="Learn how NepalCasts protects actors, directors, and filmmakers from scams. Read our verified safety guidelines, casting verification protocols, and audition security."
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
        {/* Navigation Bar */}
        <div className="flex items-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            title="Go Back"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Verified Industry Safety</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-white leading-tight">
            Trust & Safety <span className="text-[#522C69]">Center</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg leading-relaxed">
            Your safety and professional dignity are our highest priorities. We enforce strict manual vetting standards to guarantee an authentic, scam-free casting ecosystem across Nepal.
          </p>
        </div>

        {/* Verification Protocol Banner */}
        <section className="bg-[#181818] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Casting Director & Production Vetting Protocol
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                  Every production house, director, and agency undergoes manual review before posting jobs.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>E-E-A-T Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                step: '01',
                title: 'Identity & Registration',
                desc: 'Government-issued citizenship ID and company registration documentation required from all casting entities.',
                icon: FileCheck,
              },
              {
                step: '02',
                title: 'Portfolio Review',
                desc: 'Verifiable proof of work history, IMDb film credits, YouTube/Vimeo links, and active production history.',
                icon: Sparkles,
              },
              {
                step: '03',
                title: 'Direct Communication Audit',
                desc: 'Corporate email addresses and official domain checks. Free webmail providers undergo secondary manual verification.',
                icon: MessageSquare,
              },
              {
                step: '04',
                title: 'The Verified Checkmark',
                desc: 'Only authorized casting directors receive the official Verified Checkmark badge displayed on all calls and profiles.',
                icon: ShieldCheck,
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-[#141414] rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-4 hover:bg-[#111111] transition-colors shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#522C69] font-mono tracking-wider">{item.step}</span>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-white text-base leading-snug">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actor Scam Prevention Guide */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Actor & Talent Scam Prevention Guide
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Protect yourself by knowing the key warning signs of illegitimate casting calls.
              </p>
            </div>
            <ShieldAlert className="w-7 h-7 text-white shrink-0 hidden sm:block" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: AlertTriangle,
                title: 'Never Pay to Audition',
                desc: 'Legitimate filmmakers will never demand audition fees, script fees, registration charges, or mandatory paid photoshoot packages.',
                badge: 'Zero Upfront Cost',
                badgeColor: 'text-red-400 bg-red-500/15',
              },
              {
                icon: MapPin,
                title: 'Safe Audition Locations',
                desc: 'Official auditions always occur in studios, corporate offices, or established public venues. Never attend an audition in a hotel room or private home.',
                badge: 'Verified Studios Only',
                badgeColor: 'text-amber-400 bg-amber-500/15',
              },
              {
                icon: MessageSquare,
                title: 'Keep Chats On-Platform',
                desc: 'Use NepalCasts encrypted messages. Fraudulent actors attempt to immediately switch to WhatsApp or Telegram to avoid audit trails.',
                badge: 'In-App Protection',
                badgeColor: 'text-[#522C69] bg-[#522C69]/15',
              },
              {
                icon: Lock,
                title: 'Protect Sensitive Personal Data',
                desc: 'Never share bank details, OTP codes, or sensitive identification before an official contract with production management is executed.',
                badge: 'Privacy Standard',
                badgeColor: 'text-purple-400 bg-purple-500/15',
              },
              {
                icon: FileCheck,
                title: 'Insist on Written Contracts',
                desc: 'Ensure all roles, remuneration, shoot schedules, and usage rights are clearly defined in a binding bilateral agreement prior to shooting.',
                badge: 'Legal Security',
                badgeColor: 'text-emerald-400 bg-emerald-500/15',
              },
              {
                icon: ShieldCheck,
                title: 'Report Suspicious Activity',
                desc: 'If any user exhibits inappropriate behavior or violates community guidelines, report their profile or casting call immediately for instant moderation.',
                badge: '24/7 Moderation',
                badgeColor: 'text-sky-400 bg-sky-500/15',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-[#181818] rounded-2xl p-6 sm:p-7 space-y-4 hover:bg-[#1c1c1c] shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <card.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{card.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Emergency & Support Callout */}
        <section className="bg-[#181818] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-white">Need to report a scam or security concern?</h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Our trust & safety team reviews reported accounts and notices within 2 business hours.
            </p>
          </div>
          <a
            href="mailto:safety@nepalcasts.com"
            className="px-6 py-3 bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 border border-[#522C69]/40 text-white shadow-sm font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0"
          >
            Contact Safety Team
          </a>
        </section>
      </div>
    </div>
  );
}
