import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignUp } from '@clerk/clerk-react';
import { ChevronLeft, Eye, EyeOff, Loader2, Play, ChevronDown } from 'lucide-react';
import { LogoIcon } from '../../components/ui/Logo';
import SEO from '../../components/SEO';

interface SignUpProps {
    onNavigate?: (page: string, param?: any) => void;
    showAlert?: (config: {
        type: 'success' | 'error';
        message: string;
    }) => void;
}

const ROLES = [
    { value: 'Actors', label: 'Actor / Talent' },
    { value: 'Directors', label: 'Casting Director / Director' },
    { value: 'Models', label: 'Model' },
    { value: 'Dancers', label: 'Dancer' },
    { value: 'Musicians', label: 'Musician / Audio' },
    { value: 'Voice Over', label: 'Voice Over Artist' },
    { value: 'Writers', label: 'Writer / Screenwriter' },
    { value: 'VFX', label: 'VFX / Crew' },
];

export default function SignUp(_props: SignUpProps) {
    const navigate = useNavigate();
    const { isLoaded, signUp, setActive } = useSignUp();

    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('Actors');
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [code, setCode] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleBack = () => {
        if (pendingVerification) {
            setPendingVerification(false);
            setError(null);
            return;
        }
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    // OAuth Google Sign Up
    const handleGoogleSignUp = async () => {
        if (!isLoaded) return;
        try {
            await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/discover',
            });
        } catch (err: any) {
            console.error('Google Sign Up Error:', err);
            setError(err?.errors?.[0]?.message || 'Google sign up failed.');
        }
    };

    // Step 1: Create Account
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        if (!fullName.trim()) {
            setError('Please enter your full name.');
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

        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        try {
            await signUp.create({
                firstName,
                lastName,
                emailAddress: emailAddress.trim(),
                password,
                unsafeMetadata: {
                    role,
                },
            });

            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setPendingVerification(true);
        } catch (err: any) {
            console.error('Sign Up Error:', err);
            let msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to create account. Please check your details.';
            if (msg.toLowerCase().includes('captcha')) {
                msg = 'CAPTCHA blocked by browser extension/ad-blocker. Disable ad-blocker or turn off Bot Protection in your Clerk Dashboard.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify Email OTP Code
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !code) return;
        setError(null);
        setLoading(true);

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code: code.trim(),
            });

            if (completeSignUp.status === 'complete') {
                await setActive({ session: completeSignUp.createdSessionId });
                navigate('/discover');
            } else {
                console.log('Verification incomplete status:', completeSignUp);
                setError('Verification incomplete. Please check your code.');
            }
        } catch (err: any) {
            console.error('Verification Error:', err);
            const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid verification code.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F13] text-white flex flex-col items-center justify-start pt-6 sm:pt-10 pb-8 px-6 sm:px-8 font-sans relative overflow-y-auto">
            <SEO title="Create Account | NepalCasts" description="Join NepalCasts and discover casting calls, auditions, and premium talent in Nepal." noindex />

            {/* Main centered container */}
            <div className="w-full max-w-[370px] flex flex-col items-center z-10 relative">

                {/* Back button row */}
                <div className="w-full flex items-center justify-start mb-3">
                    <button
                        onClick={handleBack}
                        type="button"
                        className="w-10 h-10 bg-[#1A1A22] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all cursor-pointer shadow-sm active:scale-95"
                        aria-label="Back"
                        title="Go Back"
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Logo — Gold NC */}
                <div className="mb-2 flex justify-center">
                    <LogoIcon className="w-12 h-12 object-contain" />
                </div>

                {/* Title & Subtitle */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight mb-1">
                    {pendingVerification ? 'Verify your email' : 'Create your account'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 text-center font-normal mb-4">
                    {pendingVerification
                        ? `We sent a 6-digit verification code to ${emailAddress}`
                        : 'Welcome! Please fill in the details to get started.'
                    }
                </p>

                {/* Clerk CAPTCHA Mount Element */}
                <div id="clerk-captcha" className="w-full mb-3 flex justify-center" />

                {/* Error Message */}
                {error && (
                    <p className="w-full text-xs font-medium text-red-400 text-left mb-4">
                        {error}
                    </p>
                )}

                {!pendingVerification ? (
                    <>
                        {/* Google SSO Button */}
                        <button
                            type="button"
                            onClick={handleGoogleSignUp}
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

                            {/* Full name */}
                            <div className="flex flex-col space-y-1.5 text-left">
                                <label htmlFor="fullName" className="text-sm font-medium text-gray-300">
                                    Full name
                                </label>
                                <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                    <input
                                        id="fullName"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter your full name"
                                        style={{ paddingLeft: '20px', paddingRight: '20px', textIndent: '0px' }}
                                        className="w-full auth-input-field h-full bg-transparent border-0 text-white text-sm placeholder-gray-500/80 focus:outline-none font-medium rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Select role */}
                            <div className="flex flex-col space-y-1.5 text-left">
                                <label htmlFor="role" className="text-sm font-medium text-gray-300">
                                    Select role
                                </label>
                                <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                    <select
                                        id="role"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        style={{ paddingLeft: '20px', paddingRight: '40px', textIndent: '0px' }}
                                        className="w-full auth-input-field pr-10 h-full bg-transparent border-0 text-white text-sm focus:outline-none font-medium rounded-xl appearance-none cursor-pointer"
                                    >
                                        {ROLES.map((r) => (
                                            <option key={r.value} value={r.value} className="bg-[#1C1C26] text-white py-2">
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-5 h-5 text-gray-400 absolute right-4 pointer-events-none" />
                                </div>
                            </div>

                            {/* Email address */}
                            <div className="flex flex-col space-y-1.5 text-left">
                                <label htmlFor="emailAddress" className="text-sm font-medium text-gray-300">
                                    Email address
                                </label>
                                <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                    <input
                                        id="emailAddress"
                                        type="email"
                                        required
                                        autoComplete="off"
                                        value={emailAddress}
                                        onChange={(e) => setEmailAddress(e.target.value)}
                                        placeholder="Enter your email address"
                                        style={{ paddingLeft: '20px', paddingRight: '20px', textIndent: '0px' }}
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

                            {/* Confirm password */}
                            <div className="flex flex-col space-y-1.5 text-left">
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                                    Confirm password
                                </label>
                                <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/[0.08] rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[44px]">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
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

                            {/* Continue Button */}
                            <button
                                type="submit"
                                disabled={loading || !fullName || !emailAddress || !password || !confirmPassword}
                                className="w-full py-3 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4AD1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all mt-2 cursor-pointer border-0 shadow-lg active:scale-[0.99] min-h-[44px] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Creating account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue</span>
                                        <Play className="w-3 h-3 fill-current ml-0.5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    /* Step 2: Verification Code Form */
                    <form onSubmit={handleVerifyCode} className="w-full space-y-5">
                        <div className="flex flex-col space-y-2 text-left">
                            <label htmlFor="code" className="text-sm font-semibold text-white">
                                Verification Code
                            </label>
                            <div className="relative w-full flex items-center bg-[#1C1C26] border border-white/12 rounded-xl focus-within:border-[#6C5CE7] transition-all min-h-[52px]">
                                <input
                                    id="code"
                                    type="text"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="w-full px-5 h-full bg-transparent border-0 text-white text-base placeholder-gray-500 focus:outline-none font-medium rounded-xl tracking-wider"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !code}
                            className="w-full py-4 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4AD1] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all mt-2 cursor-pointer border-0 shadow-lg active:scale-[0.99] min-h-[52px] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Verifying code...</span>
                                </>
                            ) : (
                                <>
                                    <span>Complete Sign Up</span>
                                    <Play className="w-3 h-3 fill-current ml-0.5" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Footer link */}
                <div className="mt-8 flex items-center justify-center gap-1.5 text-sm text-gray-400 font-medium">
                    <span>Already have an account?</span>
                    <button
                        onClick={() => navigate('/signin')}
                        type="button"
                        className="text-[#826BF1] hover:underline font-semibold cursor-pointer"
                    >
                        Sign in
                    </button>
                </div>
            </div>
        </div>
    );
}
