import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUp as ClerkSignUp } from '@clerk/clerk-react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from '../../components/ui/Logo';
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
        <div className="min-h-screen bg-[#060609] text-white flex flex-col md:flex-row relative overflow-hidden font-sans">
            <SEO title="Create Account | NepalCasts" description="Join NepalCasts with Clerk security." schema={undefined} />

            {/* Ambient Background Lights */}
            <div className="absolute top-[-150px] right-[-150px] w-[600px] h-[600px] bg-[#00BFFF]/12 rounded-full blur-[160px] pointer-events-none z-0" />
            <div className="absolute bottom-[-150px] left-[-150px] w-[600px] h-[600px] bg-purple-600/12 rounded-full blur-[160px] pointer-events-none z-0" />

            {/* Left Cinematic Showcase Banner (Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 bg-cover bg-center overflow-hidden" style={{ backgroundImage: "url('/cinematic_backstage.png')" }}>
                <div className="absolute inset-0 bg-gradient-to-tr from-[#06060A]/95 via-[#06060A]/80 to-[#06060A]/40 z-0"></div>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,191,255,0.15),transparent_70%)] z-0" />
                
                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs text-[#00BFFF] font-bold tracking-wide backdrop-blur-md shadow-xl">
                        <Sparkles className="w-4 h-4 text-[#00BFFF]" />
                        Nepal's #1 Cinema Network
                    </div>
                </div>

                <div className="relative z-10 max-w-lg space-y-6 text-left my-auto">
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.12]">
                        Create Your Profile & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00BFFF] via-sky-300 to-amber-300">Showcase Your Talent</span>
                    </h2>
                    <p className="text-gray-300 text-sm font-medium leading-relaxed">
                        Join Nepal's premier casting network powered by secure Clerk authentication. Build your verified portfolio today.
                    </p>

                    <div className="space-y-3 pt-2">
                        {[
                            "Free Casting Calls & Audition Access",
                            "Direct Inquiries from Film & Ad Producers",
                            "High-Visibility Verified Creator Badges"
                        ].map((item, index) => (
                            <div key={index} className="flex items-center gap-3 text-xs font-semibold text-gray-200">
                                <div className="w-5 h-5 rounded-full bg-[#00BFFF]/20 border border-[#00BFFF]/40 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00BFFF]" />
                                </div>
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-gray-500 text-left font-medium flex items-center justify-between">
                    <span>© 2026 NepalCasts. All rights reserved.</span>
                    <span className="flex items-center gap-1.5 text-gray-400">
                        <ShieldCheck className="w-4 h-4 text-[#00BFFF]" /> Secured by Clerk
                    </span>
                </div>
            </div>

            {/* Right Sign Up Container */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 z-10 overflow-y-auto relative my-auto">
                <div className="w-full max-w-[460px] bg-[#101017]/90 border border-white/12 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-10 flex flex-col items-center relative shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden">
                    
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00BFFF] to-transparent opacity-90" />

                    <button 
                        onClick={handleBack} 
                        type="button" 
                        className="self-start flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors mb-4 cursor-pointer group"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span>Back</span>
                    </button>

                    <div className="flex flex-col items-center text-center mb-6">
                        <Logo size="lg" className="mb-4" />
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Create Account</h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">Join Nepal's talent & casting network</p>
                    </div>

                    <div className="w-full flex justify-center">
                        <ClerkSignUp
                            appearance={{
                                elements: {
                                    rootBox: 'w-full flex justify-center',
                                    cardBox: 'w-full shadow-none border-0 bg-transparent p-0',
                                    card: 'bg-transparent shadow-none border-0 p-0 w-full',
                                    socialButtonsBlockButton: 'w-full bg-white/[0.07] hover:bg-white/12 border border-white/15 text-white rounded-xl py-3.5 px-4 font-semibold text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-3 cursor-pointer mb-2 hover:border-[#00BFFF]/40',
                                    socialButtonsBlockButtonText: 'text-white font-bold text-sm',
                                    dividerRow: 'my-4',
                                    dividerLine: 'bg-white/10',
                                    dividerText: 'text-gray-400 text-xs uppercase tracking-wider font-semibold px-3 bg-[#101017]',
                                    form: 'w-full space-y-4',
                                    formFieldRow: 'flex flex-row items-start gap-3 w-full mb-3.5',
                                    formFieldInput: 'w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/20 text-white placeholder-gray-400 focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF] transition-all text-sm font-medium',
                                    formButtonPrimary: 'w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00BFFF] via-[#0099FF] to-[#0066FF] text-black font-extrabold text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_30px_rgba(0,191,255,0.4)] mt-2 cursor-pointer',
                                    footerActionText: 'text-gray-400 text-xs font-medium',
                                    footerActionLink: 'text-[#00BFFF] hover:text-sky-300 font-bold text-xs ml-1 transition-colors',
                                }
                            }}
                            signInUrl="/signin"
                            forceRedirectUrl="/"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
