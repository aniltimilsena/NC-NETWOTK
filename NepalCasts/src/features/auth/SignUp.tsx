import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp as ClerkSignUp } from '@clerk/clerk-react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { LogoIcon } from '../../components/ui/Logo';
import SEO from '../../components/SEO';

interface SignUpProps {
    onNavigate: (page: string, param?: any) => void;
    showAlert?: (config: {
        type: 'success' | 'error';
        message: string;
    }) => void;
}

export default function SignUp({ onNavigate }: SignUpProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-[#1E1E1E] text-white flex items-center justify-center relative overflow-hidden font-sans">
            <SEO title="Create Account | NepalCasts" description="Join NepalCasts and discover casting calls, auditions, and premium talent in Nepal." noindex />

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
                <h1 className="text-xl font-bold text-white tracking-[0.1em] uppercase mb-1">Create Account</h1>
                <p className="text-[10px] text-[#9CA3AF] font-medium tracking-[0.2em] uppercase mb-6">Join Nepal's talent & casting network</p>

                {/* Clerk Sign Up Form */}
                <div className="w-full flex justify-center">
                    <ClerkSignUp
                        appearance={{
                            elements: {
                                rootBox: 'w-full flex justify-center',
                                cardBox: 'w-full shadow-none border-0 bg-transparent p-0',
                                card: 'bg-transparent shadow-none border-0 p-0 w-full',
                                header: 'hidden',
                                headerTitle: 'hidden',
                                headerSubtitle: 'hidden',
                                socialButtonsBlockButton: 'w-full !bg-[#000000] hover:!bg-[#0a0a0a] border !border-[#2A2A2A] text-white !rounded-none py-4 px-6 font-semibold text-sm tracking-wide transition-colors duration-150 flex items-center justify-center gap-3 cursor-pointer mb-4 hover:!border-[#444] !shadow-none uppercase',
                                socialButtonsBlockButtonText: 'text-white font-semibold text-sm uppercase tracking-wider',
                                socialButtonsBlockButtonArrow: 'hidden',
                                dividerRow: 'my-6',
                                dividerLine: 'bg-[#2A2A2A]',
                                dividerText: 'text-[#9CA3AF] text-[10px] uppercase tracking-[0.2em] font-semibold px-4 bg-[#1E1E1E]',
                                form: 'w-full space-y-5',
                                formFieldRow: 'flex flex-row items-start gap-3 w-full',
                                formFieldLabel: 'hidden',
                                formFieldInput: 'w-full px-6 py-4 !rounded-none !bg-[#000000] border !border-[#2A2A2A] text-white text-center text-sm placeholder-[#9CA3AF] focus:!border-[#444] focus:ring-0 focus:outline-none transition-colors font-medium tracking-wide !shadow-none',
                                formFieldInputShowPasswordButton: 'text-white hover:text-[#9CA3AF]',
                                formButtonPrimary: 'w-full py-4 !rounded-none !bg-[#000000] hover:!bg-[#0a0a0a] text-white font-bold text-sm uppercase tracking-[0.15em] transition-colors mt-2 cursor-pointer border !border-[#2A2A2A] hover:!border-[#444] !shadow-none',
                                footerAction: 'hidden',
                                footerActionText: 'hidden',
                                footerActionLink: 'hidden',
                                footer: 'hidden',
                                identityPreview: '!bg-[#000000] border !border-[#2A2A2A] !rounded-none py-3 px-5',
                                identityPreviewEditButton: 'text-[#9CA3AF] hover:text-white',
                                identityPreviewText: 'text-white text-sm',
                                formResendCodeLink: 'text-[#9CA3AF] hover:text-white text-xs',
                                otpCodeFieldInput: '!bg-[#000000] border !border-[#2A2A2A] text-white text-center !rounded-none',
                                alternativeMethodsBlockButton: 'text-[#9CA3AF] hover:text-white !bg-[#000000] border !border-[#2A2A2A] !rounded-none',
                                badge: 'bg-white/5 text-[#9CA3AF] border border-[#2A2A2A] text-[10px] font-bold px-2 py-0.5',
                                tagPillIcon: 'text-white',
                            }
                        }}
                        signInUrl="/signin"
                        forceRedirectUrl="/"
                    />
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-[#2A2A2A] my-6" />

                {/* Already have an account */}
                <div className="flex flex-col items-center gap-3">
                    <span className="text-xs text-[#9CA3AF] font-medium tracking-wide uppercase">Already have an account?</span>
                    <button
                        onClick={() => navigate('/signin')}
                        type="button"
                        className="px-10 py-3 bg-transparent border border-[#2A2A2A] rounded-full text-[#9CA3AF] hover:text-white hover:border-[#444] text-xs font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer"
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
