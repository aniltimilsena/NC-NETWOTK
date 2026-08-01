import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import { Film, ChevronLeft, ShieldCheck } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import SEO from '../../components/SEO';

interface SignInProps {
    onNavigate: (page: string, param?: any) => void;
    showAlert?: (message: string, type?: 'success' | 'error') => void;
}

export default function SignIn({ onNavigate }: SignInProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-[#07070a] text-white flex flex-col md:flex-row relative overflow-hidden font-sans">
            <SEO title="Sign In | NepalCasts" description="Access your NepalCasts account using Clerk Pro authentication." schema={undefined} />

            {/* Ambient Background Lights */}
            <div className="absolute top-[-120px] right-[-120px] w-[500px] h-[500px] bg-[#00BFFF]/12 rounded-full blur-[140px] pointer-events-none z-0" />
            <div className="absolute bottom-[-120px] left-[-120px] w-[500px] h-[500px] bg-purple-600/12 rounded-full blur-[140px] pointer-events-none z-0" />

            {/* Left Cinematic Banner */}
            <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-16 bg-cover bg-center" style={{ backgroundImage: "url('/cinematic_backstage.png')" }}>
                <div className="absolute inset-0 bg-gradient-to-tr from-[#07070af5] via-[#07070ad5] to-[#07070a55] z-0"></div>
                <div className="flex-1" />
                <div className="relative z-10 max-w-md space-y-4 text-left">
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#00BFFF] font-semibold w-max backdrop-blur-md shadow-lg">
                        <Film className="w-3.5 h-3.5 text-[#00BFFF]" />
                        Nepal's Premier Cinema Network
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                        Discover Multiple Talents in one place
                    </h2>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed">
                        Connect, apply to roles, manage casting calls, and present your premium portfolio.
                    </p>
                </div>
                <div className="relative z-10 text-xs text-gray-500 text-left font-medium">
                    © 2026 NepalCasts. All rights reserved.
                </div>
            </div>

            {/* Right Sign In Form Container */}
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 z-10 overflow-y-auto relative my-auto">
                <div className="w-full max-w-[460px] bg-[#0d0d14]/90 border border-white/12 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-9 flex flex-col items-center relative shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden">

                    {/* Top Glow Accent Bar */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00BFFF] to-transparent opacity-80" />
                    <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-48 h-24 bg-[#00BFFF]/20 blur-[50px] pointer-events-none" />

                    <button onClick={handleBack} type="button" className="absolute top-6 left-6 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md z-20 cursor-pointer shrink-0" aria-label="Back" title="Go Back">
                        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>

                    <div className="flex flex-col items-center text-center mt-2 mb-6">
                        <Logo size="lg" className="mb-3" />

                        <h1 className="text-2xl font-black text-white tracking-tight">Welcome Back</h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">Sign in to your NepalCasts account</p>
                    </div>

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
                                    socialButtonsBlockButton: 'w-full bg-white/[0.05] hover:bg-white/10 border border-white/12 text-white rounded-xl py-3 px-4 font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer mb-2',
                                    socialButtonsBlockButtonText: 'text-white font-semibold text-sm',
                                    socialButtonsBlockButtonIcon: 'w-5 h-5 shrink-0',
                                    dividerRow: 'my-4',
                                    dividerLine: 'bg-white/10',
                                    dividerText: 'text-gray-400 text-xs uppercase tracking-wider font-semibold px-3 bg-[#0d0d14]',
                                    form: 'w-full space-y-4',
                                    formFieldRow: 'flex flex-row items-start gap-3 w-full mb-3.5',
                                    formField: 'flex-1 flex flex-col justify-start m-0 p-0',
                                    formFieldLabel: 'text-gray-300 text-xs font-bold uppercase tracking-wider mb-1 flex items-center h-5',
                                    formFieldInput: 'w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/20 text-white placeholder-gray-400 focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF] transition-all text-sm',
                                    otpCodeFieldInput: 'w-11 h-12 text-center text-lg font-bold rounded-xl bg-white/[0.08] border border-white/25 text-white focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF]',
                                    otpCodeFieldInputs: 'flex flex-row items-center justify-center gap-1.5 my-4',
                                    formButtonPrimary: 'w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00BFFF] via-[#0099FF] to-[#0066FF] text-black font-extrabold text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_25px_rgba(0,191,255,0.4)] mt-2 cursor-pointer',
                                    footer: 'hidden',
                                    footerActionText: 'text-gray-400 text-xs font-medium',
                                    footerActionLink: 'text-[#00BFFF] hover:text-sky-300 font-bold text-xs ml-1 transition-colors',
                                    identityPreviewText: 'text-white font-semibold text-sm',
                                    identityPreviewEditButton: 'text-[#00BFFF] hover:underline font-bold text-xs ml-2',
                                    formFieldSuccessText: 'text-emerald-400 text-xs font-medium mt-1',
                                    formFieldErrorText: 'text-red-400 text-xs font-medium mt-1',
                                    formFieldWarningText: 'text-amber-400 text-xs font-medium mt-1',
                                    alertText: 'text-red-400 text-xs font-medium',
                                    alert: 'bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3 text-red-400 text-xs',
                                }
                            }}
                            signUpUrl="/signup"
                            forceRedirectUrl="/"
                        />
                    </div>

                    <div className="w-full text-right mt-2">
                        <button onClick={() => navigate('/forgot-password')} type="button" className="text-xs text-[#00BFFF] hover:text-sky-300 font-semibold transition-colors cursor-pointer hover:underline">
                            Forgot password?
                        </button>
                    </div>

                    <div className="w-full border-t border-white/10 pt-4 mt-6 text-center text-xs text-gray-400">
                        Don't have an account?{' '}
                        <button onClick={() => navigate('/signup')} type="button" className="text-[#00BFFF] hover:text-sky-300 font-bold ml-1 transition-colors cursor-pointer hover:underline">
                            Sign Up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
