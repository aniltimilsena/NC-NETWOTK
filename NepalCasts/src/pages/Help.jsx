import React, { useState } from 'react';
import SEO from '../components/SEO';
import { HelpCircle, ShieldCheck, UserCheck, FileText, ChevronDown } from 'lucide-react';

export default function Help() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I apply for casting calls on NepalCasts?",
      a: "Browse active opportunities on the Casting page (/casting), select a call that matches your profile, select the role you're interested in, and click 'Submit Application'. Your verified portfolio will be delivered directly to the casting director."
    },
    {
      q: "How do Directors get verified badges?",
      a: "Directors and production houses can request verification through their Account Settings or by contacting support@nepalcasts.com with proof of production credits (IMDb, film posters, studio credentials)."
    },
    {
      q: "Is NepalCasts free for actors and models?",
      a: "Yes! Creating a portfolio, discovering talent, and applying to casting calls is 100% free for all performers."
    },
    {
      q: "How do I report fake casting calls or suspicious activity?",
      a: "Safety is our priority. Every casting notice has a 'Report' button. You can also review our Trust & Safety guidelines (/trust-safety) or email support@nepalcasts.com immediately."
    },
    {
      q: "Can I update my headshots and work experience after creating a profile?",
      a: "Yes. Go to your Profile page (/profile/me or click Profile in the menu) and select 'Edit Profile' to add new photos, showreels, and updated credits."
    }
  ];

  return (
    <div className="min-h-screen bg-nc-dark pt-4 pb-12 text-white">
      <SEO
        title="Help & FAQ Center | NepalCasts Support"
        description="Find answers to common questions about auditions, profile verification, casting call submissions, and account management on NepalCasts."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 pt-6">
          <div className="w-12 h-12 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Help & <span className="text-[#00BFFF]">FAQ Center</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Everything you need to know about using NepalCasts for talent discovery and auditions.
          </p>
        </div>

        {/* Quick Topics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: UserCheck, title: 'Profile & Portfolio', desc: 'Setting up your profile, photos, and skills' },
            { icon: FileText, title: 'Auditions & Applications', desc: 'Applying to casting calls and tracking status' },
            { icon: ShieldCheck, title: 'Trust & Safety', desc: 'Scam prevention and verification guidelines' }
          ].map((topic, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <topic.icon className="w-5 h-5 text-[#00BFFF]" />
              <h3 className="text-sm font-bold text-white">{topic.title}</h3>
              <p className="text-xs text-gray-400">{topic.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-all"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full px-6 py-4 text-left font-bold text-sm text-white flex justify-between items-center gap-4 hover:bg-white/[0.02]"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeFaq === index ? 'rotate-180 text-[#00BFFF]' : ''}`} />
              </button>
              {activeFaq === index && (
                <div className="px-6 pb-4 text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Footer */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-sm font-bold text-white">Still have questions?</h3>
            <p className="text-xs text-gray-400">Our support team is here to assist you with any inquiries.</p>
          </div>
          <a
            href="/contact"
            className="px-5 py-2.5 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shrink-0"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
