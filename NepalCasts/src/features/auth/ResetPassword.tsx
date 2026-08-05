import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, ShieldCheck } from 'lucide-react';
import { LogoIcon } from '../../components/ui/Logo';
import SEO from '../../components/SEO';

export default function ResetPassword() {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/signin');
    };

    return (
        <div className="min-h-screen bg-[#1E1E1E] text-white flex items-center justify-center relative overflow-hidden font-sans">
            <SEO title="Reset Password | NepalCasts" description="Set your new NepalCasts password securely." noindex />

            {/* Back button — sharp rectangle */}
            <button
                onClick={handleBack}
                type="button"
                className="absolute top-6 left-6 w-10 h-10 bg-transparent border border-[#2A2A2A] rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-white hover:border-[#444] transition-colors z-20 cursor-pointer"
                aria-label="Back"
                title="Go Back"
            >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Main centered card */}
            <div className="w-full max-w-[420px] flex flex-col items-center px-6 py-8 z-10 relative">

                {/* Logo — circular container */}
                <div className="w-[100px] h-[100px] bg-[#000000] border border-[#2A2A2A] rounded-full flex items-center justify-center mb-6">
                    <LogoIcon className="w-16 h-16" />
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-white tracking-[0.1em] uppercase mb-1">Create New Password</h1>
                <p className="text-[10px] text-[#9CA3AF] font-medium tracking-[0.2em] uppercase mb-6">Managed through Clerk security</p>

                {/* Info card — flat rectangle */}
                <div className="w-full bg-[#000000] border border-[#2A2A2A] p-8 flex flex-col items-center gap-6">
                    <div className="w-14 h-14 bg-[#1E1E1E] border border-[#2A2A2A] flex items-center justify-center">
                        <Lock className="w-7 h-7 text-white" />
                    </div>

                    <p className="text-xs text-[#9CA3AF] leading-relaxed text-center max-w-xs font-medium">
                        To reset or change your password, use the <span className="font-bold text-white">"Forgot password?"</span> link on the sign-in screen or visit Account Settings.
                    </p>

                    <button
                        onClick={handleBack}
                        type="button"
                        className="w-full py-4 bg-[#000000] border border-[#2A2A2A] hover:border-[#444] text-white font-bold text-sm uppercase tracking-[0.15em] transition-colors cursor-pointer"
                    >
                        Return to Sign In
                    </button>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-[#2A2A2A] my-10" />

                {/* Footer */}
                <div className="flex flex-col items-center gap-3">
                    <span className="text-xs text-[#9CA3AF] font-medium tracking-wide uppercase">Remembered your password?</span>
                    <button
                        onClick={() => navigate('/signin')}
                        type="button"
                        className="px-10 py-3 bg-[#000000] border border-[#2A2A2A] text-[#9CA3AF] hover:text-white hover:border-[#444] text-xs font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer"
                    >
                        Sign In
                    </button>
                </div>

                {/* Security badge */}
                <div className="mt-10 flex items-center gap-2 text-[#9CA3AF]/50 text-[10px] font-medium tracking-wider uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Secured by Clerk</span>
                </div>
            </div>
        </div>
    );
}
