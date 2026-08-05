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
        <div className="min-h-screen bg-[#2b2b2b] text-white flex items-center justify-center relative overflow-hidden font-sans">
            <SEO title="Create Account | NepalCasts" description="Join NepalCasts and discover casting calls, auditions, and premium talent in Nepal." noindex />

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
                <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Create Account</h1>
                <p className="text-xs text-gray-500 font-medium mb-8">Join Nepal's talent & casting network</p>

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
                                socialButtonsBlockButton: 'w-full !bg-black hover:!bg-[#0a0a0a] border !border-[#333] text-white !rounded-none py-4 px-6 font-medium text-base transition-all duration-200 shadow-lg flex items-center justify-center gap-3 cursor-pointer mb-4 hover:!border-[#444]',
                                socialButtonsBlockButtonText: 'text-white font-medium text-base',
                                socialButtonsBlockButtonArrow: 'hidden',
                                dividerRow: 'my-6',
                                dividerLine: 'bg-[#333]',
                                dividerText: 'text-gray-500 text-xs uppercase tracking-wider font-semibold px-4 bg-[#2b2b2b]',
                                form: 'w-full space-y-6',
                                formFieldRow: 'flex flex-row items-start gap-3 w-full',
                                formFieldLabel: 'hidden',
                                formFieldInput: 'w-full px-6 py-4 !rounded-none !bg-black border !border-[#333] text-white text-center text-base placeholder-gray-500 focus:!border-[#555] focus:ring-0 focus:outline-none transition-all font-medium',
                                formFieldInputShowPasswordButton: 'text-gray-400 hover:text-gray-200',
                                formButtonPrimary: 'w-full py-4 !rounded-none !bg-black hover:!bg-[#0a0a0a] text-white font-bold text-lg tracking-wide transition-all shadow-lg mt-5 cursor-pointer border !border-[#333] hover:!border-[#444]',
                                footerAction: 'hidden',
                                footerActionText: 'hidden',
                                footerActionLink: 'hidden',
                                footer: 'hidden',
                                identityPreview: '!bg-black border !border-[#333] !rounded-none py-3 px-5',
                                identityPreviewEditButton: 'text-gray-400 hover:text-white',
                                identityPreviewText: 'text-white text-base',
                                formResendCodeLink: 'text-gray-400 hover:text-white text-xs',
                                otpCodeFieldInput: '!bg-black border !border-[#333] text-white text-center !rounded-none',
                                alternativeMethodsBlockButton: 'text-gray-400 hover:text-white !bg-black border !border-[#333] !rounded-none',
                                badge: 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 text-[10px] font-bold px-2 py-0.5 rounded-full',
                                tagPillIcon: 'text-[#00BFFF]',
                            }
                        }}
                        signInUrl="/signin"
                        forceRedirectUrl="/"
                    />
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-white/8 my-8" />

                {/* Already have an account */}
                <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Already have an account?</span>
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
