import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { LogoIcon } from '../../components/ui/Logo';
import SEO from '../../components/SEO';

interface ForgotPasswordProps {
    onNavigate?: (page: string) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onNavigate) onNavigate('signin');
        else navigate('/signin');
    };

    return (
        <div className="min-h-screen bg-[#2b2b2b] text-white flex items-center justify-center relative overflow-hidden font-sans">
            <SEO title="Forgot Password | NepalCasts Account Recovery" description="Reset your NepalCasts account password safely." noindex />

            {/* Subtle ambient glow */}
            <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-white/[0.03] rounded-full blur-[200px] pointer-events-none z-0" />

            {/* Back button */}
            <button
                onClick={handleBack}
                type="button"
                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all z-20 cursor-pointer"
                aria-label="Back"
                title="Go Back"
            >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Main centered card */}
            <div className="w-full max-w-[420px] flex flex-col items-center px-6 py-10 z-10 relative">

                {/* Logo Circle */}
                <div className="w-[120px] h-[120px] rounded-full bg-[#6b6b6b] flex items-center justify-center mb-8 shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                    <LogoIcon className="w-20 h-20 relative z-10" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Reset Password</h1>
                <p className="text-xs text-gray-500 font-medium mb-8">Enter your email to receive a password reset code</p>

                {/* Clerk Form */}
                <div className="w-full flex justify-center">
                    <ClerkSignIn
                        appearance={{
                            elements: {
                                rootBox: 'w-full flex justify-center',
                                cardBox: 'w-full shadow-none border-0 bg-transparent p-0',
                                card: 'bg-transparent shadow-none border-0 p-0 w-full',
                                header: 'hidden',
                                headerTitle: 'hidden',
                                headerSubtitle: 'hidden',
                                socialButtonsBlockButton: 'w-full bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white rounded-md py-3.5 px-5 font-semibold text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-3 cursor-pointer mb-3 hover:border-white/20',
                                socialButtonsBlockButtonText: 'text-white font-semibold text-sm',
                                socialButtonsBlockButtonArrow: 'hidden',
                                dividerRow: 'my-5',
                                dividerLine: 'bg-white/8',
                                dividerText: 'text-gray-500 text-xs uppercase tracking-wider font-semibold px-4 bg-[#2b2b2b]',
                                form: 'w-full space-y-5 flex flex-col',
                                formFieldRow: 'flex flex-row items-start gap-3 w-full',
                                formFieldLabel: 'hidden',
                                formFieldInput: 'w-full px-5 py-4 rounded-md bg-[#1a1a1a] border border-white/8 text-white placeholder-gray-500 focus:border-white/25 focus:ring-0 focus:outline-none transition-all text-sm font-medium shadow-inner',
                                formFieldInputShowPasswordButton: 'text-gray-500 hover:text-gray-300',
                                formButtonPrimary: 'w-full py-4 rounded-md bg-[#1a1a1a] hover:bg-[#222] text-white font-bold text-base uppercase tracking-wider transition-all shadow-lg mt-4 cursor-pointer border border-white/8 hover:border-white/15',
                                footerAction: 'hidden',
                                footerActionText: 'hidden',
                                footerActionLink: 'hidden',
                                footer: 'hidden',
                                identityPreview: 'bg-[#1a1a1a] border border-white/10 rounded-md',
                                identityPreviewEditButton: 'text-gray-400 hover:text-white',
                                identityPreviewText: 'text-white',
                                formResendCodeLink: 'text-gray-400 hover:text-white text-xs',
                                otpCodeFieldInput: 'bg-[#1a1a1a] border border-white/10 text-white',
                                alternativeMethodsBlockButton: 'text-gray-400 hover:text-white bg-[#1a1a1a] border border-white/8 rounded-md',
                            }
                        }}
                        signUpUrl="/signup"
                        forceRedirectUrl="/"
                    />
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-white/8 my-8" />

                {/* Back to Sign In */}
                <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Remembered your password?</span>
                    <button
                        onClick={() => navigate('/signin')}
                        type="button"
                        className="px-8 py-2.5 rounded-full border border-gray-500 text-gray-400 hover:text-white hover:border-white/40 text-sm font-semibold transition-all cursor-pointer"
                    >
                        Sign In
                    </button>
                </div>

                {/* Security badge */}
                <div className="mt-8 flex items-center gap-1.5 text-gray-600 text-[10px] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Secured by Clerk</span>
                </div>
            </div>
        </div>
    );
}
