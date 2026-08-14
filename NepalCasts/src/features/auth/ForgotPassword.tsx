import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { ChevronLeft, ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { LogoIcon } from '../../components/ui/Logo';
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
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleBack = () => {
        if (successfulCreation) {
            setSuccessfulCreation(false);
            setError(null);
            setInfoMessage(null);
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
        setInfoMessage(null);
        setLoading(true);

        try {
            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: email.trim(),
            });
            setSuccessfulCreation(true);
            setInfoMessage(`We sent a 6-digit verification code to ${email}`);
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
        setInfoMessage(null);
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
        setInfoMessage(null);
        setLoading(true);

        try {
            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: email.trim(),
            });
            setInfoMessage('A new verification code has been sent to your email.');
        } catch (err: any) {
            console.error('Error resending reset code:', err);
            const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to resend code. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F13] text-white flex items-center justify-center relative overflow-hidden font-sans py-8 px-6 sm:px-8 sm:py-12">
            <SEO title="Forgot Password | NepalCasts Account Recovery" description="Reset your NepalCasts account password safely." noindex />

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
                    {successfulCreation ? 'Enter Verification Code' : 'Reset your password'}
                </h1>
                <p className="text-sm text-gray-400 text-center font-normal mb-7">
                    {successfulCreation
                        ? `Enter the 6-digit code sent to ${email} and choose a new password.`
                        : 'Enter your email address to receive a verification code.'
                    }
                </p>

                {/* Info message banner */}
                {infoMessage && (
                    <div className="w-full bg-[#162B21] border border-[#22C55E]/30 text-[#4ADE80] text-xs font-medium px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
                        <span>{infoMessage}</span>
                    </div>
                )}

                {/* Error message text */}
                {error && (
                    <p className="w-full text-xs font-medium text-red-400 text-left mb-3">
                        {error}
                    </p>
                )}

                {/* Step 1: Email Form */}
                {!successfulCreation ? (
                    <form onSubmit={handleSendCode} className="w-full space-y-3.5">
                        <div className="flex flex-col space-y-1.5 text-left">
                            <label htmlFor="email" className="text-sm font-medium text-gray-300">
                                Email address
                            </label>
                            <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="off"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    style={{ paddingLeft: '20px', paddingRight: '20px', textIndent: '0px' }}
                                    className="w-full auth-input-field h-full bg-transparent border-0 text-white text-sm placeholder-gray-500/80 focus:outline-none font-medium rounded-xl"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4AD1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all mt-2 cursor-pointer border-0 shadow-lg active:scale-[0.99] min-h-[44px] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Sending code...</span>
                                </>
                            ) : (
                                <span>Continue</span>
                            )}
                        </button>
                    </form>
                ) : (
                    /* Step 2: Verification Code & New Password Form */
                    <form onSubmit={handleResetPassword} className="w-full space-y-3.5">
                        {/* OTP Verification Code */}
                        <div className="flex flex-col space-y-1.5 text-left">
                            <label htmlFor="code" className="text-sm font-medium text-gray-300 flex items-center justify-between">
                                <span>Verification Code</span>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={loading}
                                    className="text-xs text-[#826BF1] hover:underline font-semibold cursor-pointer border-0 bg-transparent p-0"
                                >
                                    Resend code
                                </button>
                            </label>
                            <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                <input
                                    id="code"
                                    type="text"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    style={{ paddingLeft: '20px', paddingRight: '20px', textIndent: '0px' }}
                                    className="w-full auth-input-field h-full bg-transparent border-0 text-white text-sm placeholder-gray-500/80 focus:outline-none font-medium rounded-xl tracking-wider"
                                />
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="flex flex-col space-y-1.5 text-left">
                            <label htmlFor="password" className="text-sm font-medium text-gray-300">
                                New password
                            </label>
                            <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password (min. 8 chars)"
                                    style={{ paddingLeft: '20px', paddingRight: '48px', textIndent: '0px' }}
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

                        {/* Confirm Password */}
                        <div className="flex flex-col space-y-1.5 text-left">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                                Confirm new password
                            </label>
                            <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    style={{ paddingLeft: '20px', paddingRight: '48px', textIndent: '0px' }}
                                    className="w-full auth-input-field-password h-full bg-transparent border-0 text-white text-sm placeholder-gray-500/80 focus:outline-none font-medium rounded-xl"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white bg-transparent p-2 cursor-pointer border-0 outline-none flex items-center justify-center z-10"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !code || !password || !confirmPassword}
                            className="w-full py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4AD1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all mt-2 cursor-pointer border-0 shadow-lg active:scale-[0.99] min-h-[44px] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Resetting password...</span>
                                </>
                            ) : (
                                <span>Reset password</span>
                            )}
                        </button>
                    </form>
                )}

                {/* Footer link */}
                <div className="mt-7 flex items-center justify-center gap-1.5 text-sm text-gray-400 font-medium">
                    <span>Remembered your password?</span>
                    <button
                        onClick={() => navigate('/signin')}
                        type="button"
                        className="text-[#826BF1] hover:underline font-semibold cursor-pointer"
                    >
                        Sign in
                    </button>
                </div>

                {/* Security badge */}
                <div className="mt-8 flex items-center gap-2 text-gray-500 text-xs font-medium tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-gray-500" />
                    <span>Secured by Clerk</span>
                </div>
            </div>
        </div>
    );
}
