import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { ChevronLeft, Eye, EyeOff, Loader2, Play, Check } from 'lucide-react';
import { LogoIcon } from '../../components/ui/Logo';
import SEO from '../../components/SEO';

const REMEMBER_ME_KEY = 'nc_remember_me';

interface SignInProps {
    onNavigate?: (page: string, param?: any) => void;
    showAlert?: (message: string, type?: 'success' | 'error') => void;
}

export default function SignIn({ }: SignInProps) {
    const navigate = useNavigate();
    const { isLoaded, signIn, setActive } = useSignIn();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBER_ME_KEY) === 'true');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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

    // Google SSO Sign In
    const handleGoogleSignIn = async () => {
        if (!isLoaded) return;
        try {
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/discover',
            });
        } catch (err: any) {
            console.error('Google Sign In Error:', err);
            setError(err?.errors?.[0]?.message || 'Google sign in failed.');
        }
    };

    // Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !email || !password) return;
        setError(null);
        setLoading(true);

        try {
            const result = await signIn.create({
                identifier: email.trim(),
                password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                navigate('/discover');
            } else {
                console.log('Sign in status:', result);
                setError('Sign in incomplete. Please check your credentials.');
            }
        } catch (err: any) {
            console.error('Sign In Error:', err);
            const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid email or password.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F13] text-white flex items-center justify-center relative overflow-hidden font-sans py-8 px-6 sm:px-8 sm:py-12">
            <SEO title="Sign In | NepalCasts" description="Access your NepalCasts account safely." noindex />

            {/* Back button */}
            <button
                onClick={handleBack}
                type="button"
                className="absolute top-4 left-4 sm:top-6 sm:left-6 w-10 h-10 bg-[#1A1A22] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all z-20 cursor-pointer shadow-sm active:scale-95"
                aria-label="Back"
                title="Go Back"
            >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Main centered container */}
            <div className="w-full max-w-[370px] flex flex-col items-center z-10 relative">

                {/* Logo — Gold NC */}
                <div className="mb-5 flex justify-center">
                    <LogoIcon className="w-14 h-14 object-contain" />
                </div>

                {/* Title & Subtitle */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight mb-2">
                    Welcome back
                </h1>
                <p className="text-sm text-gray-400 text-center font-normal mb-7">
                    Please enter your details to sign in.
                </p>

                {/* Error Banner */}
                {error && (
                    <p className="w-full text-xs font-medium text-red-400 text-left mb-4">
                        {error}
                    </p>
                )}

                {/* Google SSO Button */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full bg-[#1A1A22] hover:bg-[#22222D] border border-white/10 hover:border-white/20 text-white rounded-xl py-2.5 px-4 font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer mb-5 min-h-[44px]"
                >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="text-gray-200 font-medium text-sm">Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="w-full flex items-center justify-center gap-4 mb-5">
                    <div className="flex-1 h-[1px] bg-white/10" />
                    <span className="text-xs text-gray-400 font-medium">or</span>
                    <div className="flex-1 h-[1px] bg-white/10" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-3.5">
                    {/* Email address */}
                    <div className="flex flex-col space-y-1.5 text-left">
                        <label htmlFor="email" className="text-sm font-medium text-gray-300">
                            Email address
                        </label>
                        <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                className="w-full auth-input-field h-full bg-transparent border-0 text-white text-sm placeholder-gray-500/80 focus:outline-none font-medium rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="flex flex-col space-y-1.5 text-left">
                        <label htmlFor="password" className="text-sm font-medium text-gray-300">
                            Password
                        </label>
                        <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full auth-input-field-password h-full bg-transparent border-0 text-white text-sm placeholder-gray-500/80 focus:outline-none font-medium rounded-xl"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white bg-transparent p-2 cursor-pointer border-0 outline-none flex items-center justify-center z-10"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="w-full flex items-center justify-between pt-1 relative z-30">
                        <button
                            type="button"
                            onClick={toggleRememberMe}
                            className="flex items-center gap-2 cursor-pointer select-none group border-0 bg-transparent p-0"
                            aria-pressed={rememberMe}
                        >
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors duration-150 border ${rememberMe
                                ? 'bg-[#6C5CE7] border-[#6C5CE7]'
                                : 'bg-[#1C1C26] border-white/20 group-hover:border-white/40'
                                }`}>
                                {rememberMe && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-xs text-gray-400 font-medium group-hover:text-white transition-colors">Remember me</span>
                        </button>
                        <button
                            onClick={() => navigate('/forgot-password')}
                            type="button"
                            className="text-xs text-[#826BF1] hover:underline font-semibold transition-colors cursor-pointer border-0 bg-transparent p-0"
                        >
                            Forgot password?
                        </button>
                    </div>

                    {/* Continue Button */}
                    <button
                        type="submit"
                        disabled={loading || !email || !password}
                        className="w-full py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4AD1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all mt-2 cursor-pointer border-0 shadow-lg active:scale-[0.99] min-h-[44px] flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <span>Continue</span>
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer link */}
                <div className="mt-8 flex items-center justify-center gap-1.5 text-sm text-gray-400 font-medium">
                    <span>Don't have an account?</span>
                    <button
                        onClick={() => navigate('/signup')}
                        type="button"
                        className="text-[#826BF1] hover:underline font-semibold cursor-pointer"
                    >
                        Sign up
                    </button>
                </div>
            </div>
        </div>
    );
}
