import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import { ChevronLeft, ShieldCheck, Check } from 'lucide-react';
import { LogoIcon } from '../../components/ui/Logo';
import SEO from '../../components/SEO';

const REMEMBER_ME_KEY = 'nc_remember_me';

interface SignInProps {
    onNavigate: (page: string, param?: any) => void;
    showAlert?: (message: string, type?: 'success' | 'error') => void;
}

export default function SignIn({ onNavigate }: SignInProps) {
    const navigate = useNavigate();
    const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBER_ME_KEY) === 'true');

    const toggleRememberMe = useCallback(() => {
        setRememberMe(prev => {
            const next = !prev;
            if (next) {
                localStorage.setItem(REMEMBER_ME_KEY, 'true');
            } else {
                localStorage.removeItem(REMEMBER_ME_KEY);
            }
            return next;
        });
    }, []);

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-[#2b2b2b] text-white flex items-center justify-center relative overflow-hidden font-sans">
            <SEO title="Sign In | NepalCasts" description="Access your NepalCasts account using Clerk authentication." noindex />

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
                <div className="w-[120px] h-[120px] rounded-full bg-[#6b6b6b] flex items-center justify-center mb-10 shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                    <LogoIcon className="w-20 h-20 relative z-10" />
                </div>

                {/* Clerk Sign In Form */}
                <div className="w-full flex flex-col justify-center relative">
                    <ClerkSignIn
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
                                form: 'w-full space-y-6 flex flex-col',
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
                        signUpUrl="/signup"
                        forceRedirectUrl="/"
                    />
                </div>

                {/* Remember me & Forgot Password — outside Clerk wrapper */}
                <div className="w-full flex items-center justify-between mt-5 relative z-30">
                    <button
                        type="button"
                        onClick={toggleRememberMe}
                        className="flex items-center gap-2 cursor-pointer select-none group"
                        aria-pressed={rememberMe}
                    >
                        <div className={`w-4 h-4 rounded-sm flex items-center justify-center transition-all duration-150 border ${rememberMe
                            ? 'bg-[#00BFFF] border-[#00BFFF]'
                            : 'bg-transparent border-gray-500 group-hover:border-gray-300'
                            }`}>
                            {rememberMe && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-xs text-gray-300 font-medium group-hover:text-white transition-colors">Remember me</span>
                    </button>
                    <button
                        onClick={() => navigate('/forgot-password')}
                        type="button"
                        className="text-xs text-gray-300 hover:text-white font-medium transition-colors cursor-pointer underline underline-offset-2 decoration-gray-500 hover:decoration-white"
                    >
                        Forgot password?
                    </button>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-white/8 my-8" />

                {/* Not a member / Create account */}
                <div className="flex flex-col items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Not a member?</span>
                    <button
                        onClick={() => navigate('/signup')}
                        type="button"
                        className="px-8 py-2.5 rounded-full border border-gray-500 text-gray-400 hover:text-white hover:border-white/40 text-sm font-semibold transition-all cursor-pointer"
                    >
                        Create account
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
