import React from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { Shield, ChevronLeft, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#141414] pt-4 pb-16 text-white text-left">
      <SEO
        title="Privacy Policy | NepalCasts - Cinema & Talent Network"
        description="Learn how NepalCasts collects, secures, and handles your talent portfolio data, personal contact details, and account credentials."
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
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
            <Lock className="w-4 h-4 text-white" />
            <span>Data Protection & Privacy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-white leading-tight">
            Privacy <span className="text-[#00BFFF]">Policy</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg max-w-lg mx-auto leading-relaxed">
            Your privacy and creative intellectual property are strictly safeguarded at NepalCasts.
          </p>
        </div>

        <div className="bg-[#181818] rounded-2xl p-6 sm:p-10 space-y-8 text-gray-300 leading-relaxed shadow-xl">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">1. Information We Collect</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              At NepalCasts, we collect primary data explicitly provided by our talents and casting directors, including verified email addresses, phone numbers, location data, roles, skills, and portfolio media (headshots, demo reels, bio). We also collect essential telemetry and usage data to maintain platform stability and protect against automated bot activity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">2. How We Use Your Information</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Your personal information is used directly to facilitate connections between verified casting directors, producers, and talents. Key data such as direct contact details are only visible to authenticated parties when you submit an application or explicitly allow visibility.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">3. Data Sharing and Third Parties</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              We never sell your personal data or creative work to third-party advertisers. Information is only processed with trusted infrastructure providers (e.g., Firebase, Cloud Storage) required to operate the service securely under strict data protection protocols.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">4. Security & Encryption</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              We implement enterprise security standards including SSL/TLS encryption, secure Cloud Firestore security rules, and granular role-based authentication to prevent unauthorized access to your account and sensitive portfolio assets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">5. Contact & Inquiries</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              If you have any questions regarding this privacy policy or wish to request data removal, contact us at <span className="text-[#00BFFF] font-semibold">safety@nepalcasts.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
