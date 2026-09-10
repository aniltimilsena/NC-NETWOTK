import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { HelpCircle, ShieldCheck, UserCheck, FileText, ChevronDown, ChevronLeft } from 'lucide-react';

export default function Help() {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    {
      q: "How do I apply for casting calls on NepalCasts?",
      a: "Browse active opportunities on the Casting page (/casting), select a call that matches your profile, select the role you're interested in, and click 'Submit Application'. Your verified portfolio will be delivered directly to the casting director."
    },
    {
      q: "How do Directors get verified badges?",
      a: "Directors and production houses can request verification through their Account Settings or by contacting safety@nepalcasts.com with proof of production credits (IMDb, film posters, studio credentials)."
    },
    {
      q: "Is NepalCasts free for actors and models?",
      a: "Yes! Creating a portfolio, discovering talent, and applying to casting calls is 100% free for all performers."
    },
    {
      q: "How do I report fake casting calls or suspicious activity?",
      a: "Safety is our priority. Every casting notice has a 'Report' button. You can also review our Trust & Safety guidelines (/trust-safety) or email safety@nepalcasts.com immediately."
    },
    {
      q: "Can I update my headshots and work experience after creating a profile?",
      a: "Yes. Go to your Profile page (/profile or click Profile in the menu) and select 'Edit Profile' to add new photos, showreels, and updated credits."
    }
  ];

  return (
    <div className="min-h-screen bg-[#141414] pt-4 pb-16 text-white text-left">
      <SEO
        title="Help & FAQ Center | NepalCasts Support"
        description="Find answers to common questions about auditions, profile verification, casting call submissions, and account management on NepalCasts."
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

        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-white" />
            <span>Support & Guidance</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-white leading-tight">
            Help & <span className="text-[#522C69]">FAQ Center</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-lg mx-auto leading-relaxed">
            Everything you need to know about using NepalCasts for talent discovery, portfolios, and auditions.
          </p>
        </div>

        {/* Quick Topics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { icon: UserCheck, title: 'Profile & Portfolio', desc: 'Setting up your profile, headshots, showreels, and skills' },
            { icon: FileText, title: 'Auditions & Applications', desc: 'Applying to casting calls and tracking application status' },
            { icon: ShieldCheck, title: 'Trust & Safety', desc: 'Scam prevention, director vetting, and verification guidelines' }
          ].map((topic, i) => (
            <div key={i} className="p-7 rounded-2xl bg-[#181818] space-y-3 shadow-lg hover:bg-[#1c1c1c] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <topic.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-white leading-snug">{topic.title}</h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{topic.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-4 text-left">
          <h2 className="text-xl sm:text-2xl font-black text-white pb-2 border-b border-white/5 text-left">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl bg-[#181818] overflow-hidden transition-all shadow-md text-left"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full px-5 sm:px-6 py-4 sm:py-5 text-left font-bold text-sm sm:text-base text-white flex justify-between items-center gap-4 hover:bg-white/[0.02] cursor-pointer"
                >
                  <span className="text-left flex-1">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-white shrink-0 ml-auto transition-transform ${activeFaq === index ? 'rotate-180 text-[#522C69]' : ''}`} />
                </button>
                {activeFaq === index && (
                  <div className="px-5 sm:px-6 pb-5 text-xs sm:text-sm text-gray-400 text-left leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Footer */}
        <div className="p-8 sm:p-10 rounded-2xl bg-[#181818] flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left shadow-xl">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Still have questions?</h3>
            <p className="text-xs sm:text-sm text-gray-400">Our support team is here to assist you with any inquiries.</p>
          </div>
          <button
            onClick={() => navigate('/contact')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}

