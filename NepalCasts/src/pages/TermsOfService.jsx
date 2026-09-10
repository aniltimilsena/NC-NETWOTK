import React from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { FileText, ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#141414] pt-4 pb-16 text-white text-left">
      <SEO
        title="Terms of Service | NepalCasts - Cinema & Talent Network"
        description="Review the terms and conditions for using NepalCasts talent discovery, casting call submissions, and media communication services."
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
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
            <FileText className="w-4 h-4 text-white" />
            <span>Platform Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-white leading-tight">
            Terms of <span className="text-[#522C69]">Service</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-lg mx-auto leading-relaxed">
            Please review the rules and guidelines governing your participation in the NepalCasts network.
          </p>
        </div>

        <div className="bg-[#181818] rounded-2xl p-6 sm:p-10 space-y-8 text-gray-300 leading-relaxed shadow-xl">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">1. Acceptance of Terms</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              By accessing and using NepalCasts, you accept and agree to be bound by the terms and provisions of this agreement. Any participation in this platform constitutes full acceptance of these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">2. Account Registration & Authenticity</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              To apply for casting calls or post production notices, you must register for an account. You agree to provide accurate, truthful information and maintain the security of your credentials. Impersonating other artists or producers is strictly forbidden.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">3. User Content & Intellectual Property</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Users retain full ownership of all portfolio images, videos, and credits uploaded to NepalCasts. By uploading content, you grant NepalCasts a non-exclusive license to display this media within the network solely for casting matching and talent discovery.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">4. Code of Conduct & Anti-Scam Policy</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              We enforce a zero-tolerance policy against scams, unauthorized audition fees, harassment, inappropriate behavior, or unsolicited marketing. Any account found violating these principles will be permanently banned with no option for reinstatement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">5. Service Modifications</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              NepalCasts reserves the right to enhance, modify, or update features to improve security and user experience at any time. Notice will be provided on major policy revisions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
