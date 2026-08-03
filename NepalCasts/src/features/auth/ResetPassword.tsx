import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import SEO from '../../components/SEO';

export default function ResetPassword() {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/signin');
    };

    return (
        <div className="min-h-screen bg-[#060609] text-white flex flex-col md:flex-row relative overflow-hidden font-sans">
            <SEO title="Reset Password | NepalCasts" description="Set your new NepalCasts password securely." noindex />

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
                        Create New <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00BFFF] via-sky-300 to-amber-300">Secure Password</span>
                    </h2>
                    <p className="text-gray-300 text-sm font-medium leading-relaxed">
                        Update your password to keep your NepalCasts account & creator profile safe.
                    </p>

                    <div className="space-y-3 pt-2">
                        {[
                            "High-Strength Encrypted Authentication",
                            "Instant Multi-Factor Session Invalidation",
                            "Secure Clerk Single Sign-On Infrastructure"
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

            {/* Right Card Container */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 z-10 overflow-y-auto relative my-auto">
                <div className="w-full max-w-[460px] bg-[#101017]/90 border border-white/12 backdrop-blur-2xl rounded-[2rem] p-6 sm:p-10 flex flex-col items-center relative shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden">
                    
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00BFFF] to-transparent opacity-90" />

                    {/* Standard Circle Chevron Back Button */}
                    <button 
                        onClick={handleBack} 
                        type="button" 
                        className="absolute top-6 left-6 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md z-20 cursor-pointer shrink-0" 
                        aria-label="Back" 
                        title="Go Back"
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>

                    <div className="flex flex-col items-center text-center mb-6 pt-2">
                        <Logo size="lg" className="mb-4" />
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Create New Password</h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">Password changes are managed through Clerk security settings</p>
                    </div>

                    <div className="w-full space-y-6 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] flex items-center justify-center shadow-lg">
                            <Lock className="w-7 h-7" />
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed max-w-xs">
                            To reset or change your password, please use the <span className="font-bold text-[#00BFFF]">"Forgot password?"</span> link on the sign-in screen or visit Account Settings.
                        </p>

                        <button
                            onClick={handleBack}
                            type="button"
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00BFFF] via-[#0099FF] to-[#0066FF] text-black font-extrabold text-sm uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_4px_30px_rgba(0,191,255,0.4)] cursor-pointer"
                        >
                            Return to Sign In
                        </button>
                    </div>

                    {/* Footer Nav Link */}
                    <div className="w-full border-t border-white/10 pt-4 mt-6 text-center text-xs text-gray-400">
                        Remembered your password?{' '}
                        <button onClick={() => navigate('/signin')} type="button" className="text-[#00BFFF] hover:text-sky-300 font-bold ml-1 transition-colors cursor-pointer hover:underline">
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
