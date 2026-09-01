import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { ChevronLeft, Eye, EyeOff, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import SEO from '../../components/SEO';

interface ForgotPasswordProps {
    onNavigate?: (page: string) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
    const navigate = useNavigate();
    const { isLoaded, signIn, setActive } = useSignIn();

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [successfulCreation, setSuccessfulCreation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleBack = () => {
        if (successfulCreation) {
            setSuccessfulCreation(false);
            setError(null);
            return;
        }
        if (onNavigate) onNavigate('signin');
        else navigate('/signin');
    };

    // Step 1: Request Password Reset Verification Code
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !email) return;
        setError(null);
        setLoading(true);

        try {
            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: email.trim(),
            });
            setSuccessfulCreation(true);
        } catch (err: any) {
            console.error('Error initiating password reset:', err);
            const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to send reset code. Please check your email.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Submit Verification Code & Set New Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        if (!code.trim()) {
            setError('Please enter the verification code sent to your email.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const result = await signIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code: code.trim(),
                password,
            });

            if (result.status === 'complete') {
                if (result.createdSessionId) {
                    await setActive({ session: result.createdSessionId });
                }
                navigate('/');
            } else {
                console.log('Reset attempt incomplete:', result);
                setError('Verification incomplete. Please check your code.');
            }
        } catch (err: any) {
            console.error('Error setting new password:', err);
            const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid code or password requirements not met.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Resend Code Action
    const handleResendCode = async () => {
        if (!isLoaded || !email || loading) return;
        setError(null);
        setLoading(true);

        try {
            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: email.trim(),
            });
        } catch (err: any) {
            console.error('Error resending reset code:', err);
            const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to resend code. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col lg:flex-row w-full font-sans select-none overflow-x-hidden">
            <SEO title="Reset Password | NepalCasts" description="Reset your NepalCasts account password." noindex />

            {/* Left Side: Auth Form */}
            <div className="w-full lg:w-[48%] xl:w-[42%] flex flex-col items-center justify-start lg:justify-between p-6 sm:p-10 lg:p-12 min-h-screen overflow-y-auto">
                {/* Top Nav / Back */}
                <div className="w-full max-w-[400px] flex items-center justify-start mb-4 sm:mb-6">
                    <button
                        onClick={handleBack}
                        type="button"
                        className="w-9 h-9 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer active:scale-95"
                        aria-label="Back"
                        title="Go Back"
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                    </button>
                </div>

                {/* Form Container */}
                <div className="w-full max-w-[400px] flex flex-col my-0 lg:my-auto py-1 sm:py-4">
                    {/* Header */}
                    <div className="text-left mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                            {successfulCreation ? 'Enter code' : 'Reset password'}
                        </h1>
                        <p className="text-sm text-[#9ca3af] leading-normal font-normal">
                            {successfulCreation
                                ? `Enter the 6-digit code sent to ${email} and choose a new password.`
                                : 'Enter your email to receive password reset instructions.'
                            }
                        </p>
                    </div>

                    {/* Error message banner */}
                    {error && (
                        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 mb-5 text-left leading-relaxed">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Email Form */}
                    {!successfulCreation ? (
                        <form onSubmit={handleSendCode} className="w-full space-y-4">
                            <div className="flex flex-col text-left">
                                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="off"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Your email address"
                                    className="w-full bg-[#0d0d0f] border border-[#222225] focus:border-[#44444a] text-white text-sm placeholder-[#555] rounded-xl px-4 py-3.5 outline-none transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-200 disabled:bg-[#1c1c1f] disabled:text-gray-500 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all mt-6 cursor-pointer min-h-[48px] flex items-center justify-center gap-2 active:scale-[0.99] shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                                        <span>Sending code...</span>
                                    </>
                                ) : (
                                    <span>Send reset link</span>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* Step 2: Verification Code & New Password Form */
                        <form onSubmit={handleResetPassword} className="w-full space-y-4">
                            {/* OTP Verification Code */}
                            <div className="flex flex-col text-left">
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="code" className="text-sm font-medium text-white">
                                        Verification code
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={loading}
                                        className="text-sm text-[#522C69] hover:text-[#663782] hover:underline cursor-pointer font-medium bg-transparent border-0 p-0"
                                    >
                                        Resend code
                                    </button>
                                </div>
                                <input
                                    id="code"
                                    type="text"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="w-full bg-[#0d0d0f] border border-[#222225] focus:border-[#44444a] text-white text-sm placeholder-[#555] rounded-xl px-4 py-3.5 outline-none transition-all tracking-wider"
                                />
                            </div>

                            {/* New Password */}
                            <div className="flex flex-col text-left">
                                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                                    New password
                                </label>
                                <div className="relative w-full">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Your new password"
                                        className="w-full bg-[#0d0d0f] border border-[#222225] focus:border-[#44444a] text-white text-sm placeholder-[#555] rounded-xl px-4 py-3.5 pr-11 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-0 p-1 flex items-center justify-center cursor-pointer transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="flex flex-col text-left">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                                    Confirm new password
                                </label>
                                <div className="relative w-full">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        className="w-full bg-[#0d0d0f] border border-[#222225] focus:border-[#44444a] text-white text-sm placeholder-[#555] rounded-xl px-4 py-3.5 pr-11 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-0 p-1 flex items-center justify-center cursor-pointer transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !code || !password || !confirmPassword}
                                className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-200 disabled:bg-[#1c1c1f] disabled:text-gray-500 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all mt-6 cursor-pointer min-h-[48px] flex items-center justify-center gap-2 active:scale-[0.99] shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                                        <span>Resetting password...</span>
                                    </>
                                ) : (
                                    <span>Reset password</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer link */}
                    <div className="mt-8 text-center text-sm text-[#9ca3af]">
                        <span>Remembered your password? </span>
                        <button
                            onClick={() => navigate('/signin')}
                            type="button"
                            className="text-[#522C69] hover:text-[#663782] underline cursor-pointer font-medium bg-transparent border-0 p-0"
                        >
                            Log in
                        </button>
                    </div>
                </div>

                {/* Bottom copyright on mobile/tablet */}
                <div className="w-full text-center text-xs text-gray-600 lg:hidden pt-4">
                    © 2026 NepalCasts
                </div>
            </div>

            {/* Right Side: Cinematic Showcase Panel (Laptops & Desktops) */}
            <div className="hidden lg:flex flex-1 relative bg-[#08080a] flex-col justify-between p-12 xl:p-16 overflow-hidden">
                {/* Ambient Glows */}
                <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-[#522C69]/8 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

                {/* Top Brand Bar */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="NepalCasts" className="w-9 h-9 object-contain" />
                        <span className="font-extrabold text-white text-lg tracking-tight">NepalCasts</span>
                    </div>
                    <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-300">
                        Account Security
                    </span>
                </div>

                {/* Center Content Showcase */}
                <div className="relative z-10 max-w-lg space-y-6 my-auto">
                    <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-xs font-semibold">
                        <span>Secure Account Recovery</span>
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.25]">
                        Safe, encrypted credentials for artists & studios.
                    </h2>

                    <p className="text-sm xl:text-base text-gray-400 leading-relaxed font-normal">
                        Your data and profile assets are protected with industry-standard encryption and OTP verification.
                    </p>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white mb-2">
                                <KeyRound className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-sm font-bold text-white">Instant OTP</p>
                            <p className="text-xs text-gray-400 font-normal">Fast 6-digit email code recovery.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white mb-2">
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-sm font-bold text-white">Protected Access</p>
                            <p className="text-xs text-gray-400 font-normal">Encrypted authentication protocols.</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer Details */}
                <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                    <span>© 2026 NepalCasts Inc.</span>
                    <span className="text-gray-400 font-medium">Kathmandu, Nepal</span>
                </div>
            </div>
        </div>
    );
}
