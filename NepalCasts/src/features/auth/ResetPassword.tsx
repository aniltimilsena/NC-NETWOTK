import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import SEO from '../../components/SEO';
import Logo from '../../components/ui/Logo';

export default function ResetPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative font-sans">
      <SEO title="Reset Password | NepalCasts" description="Set your new NepalCasts password." />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Create New Password</h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Password changes are managed through Clerk security settings.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 backdrop-blur-xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            To reset or change your password, please use the <span className="font-semibold text-white">"Forgot password?"</span> link on the sign-in screen or visit Account Settings.
          </p>

          <button
            onClick={() => navigate('/signin')}
            className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
