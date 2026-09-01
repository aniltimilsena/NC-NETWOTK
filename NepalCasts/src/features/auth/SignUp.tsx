import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignUp } from '@clerk/clerk-react';
import { ChevronLeft, Eye, EyeOff, Loader2, ChevronDown, Check, Film, Star } from 'lucide-react';
import SEO from '../../components/SEO';

interface SignUpProps {
    onNavigate?: (page: string, param?: any) => void;
    showAlert?: (config: {
        type: 'success' | 'error';
        message: string;
    }) => void;
}

const ROLES = [
    { value: 'Actor', label: 'Actor' },
    { value: 'Director', label: 'Director' },
    { value: 'Script Writer', label: 'Script Writer' },
    { value: 'DOP / Cinematographer', label: 'DOP / Cinematographer' },
    { value: 'Model', label: 'Model' },
    { value: 'Song Writer / Singer', label: 'Song Writer / Singer' },
    { value: 'Editor / VFX', label: 'Editor / VFX' },
    { value: 'Producer / Manager', label: 'Producer / Manager' },
];

export default function SignUp({ showAlert }: SignUpProps) {
    const navigate = useNavigate();
    const { isLoaded, signUp, setActive } = useSignUp();

    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('Actor');
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState('');
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

        if (!agreeTerms) {
            setError('Please accept the Terms of Service and Privacy Policy to continue.');
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
        <div className="min-h-screen bg-[#050505] text-white flex flex-col lg:flex-row w-full font-sans select-none overflow-x-hidden">
            <SEO title="Sign up | NepalCasts" description="Create your NepalCasts account." noindex />

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
                            {pendingVerification ? 'Verify email' : 'Create an account'}
                        </h1>
                        <p className="text-sm text-[#9ca3af] leading-normal font-normal">
                            {pendingVerification
                                ? `Enter the 6-digit verification code sent to ${emailAddress}`
                                : 'Sign up for NepalCasts to continue to NepalCasts.'
                            }
                        </p>
                    </div>

                    {/* Clerk CAPTCHA Mount Element */}
                    <div id="clerk-captcha" className="w-full mb-2 flex justify-center" />

                    {/* Error Banner */}
                    {error && (
                        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 mb-5 text-left leading-relaxed">
                            {error}
                        </div>
                    )}

                    {!pendingVerification ? (
                        <>
                            {/* Google Sign Up Button */}
                            <button
                                type="button"
                                onClick={handleGoogleSignUp}
                                className="w-full bg-[#121214] hover:bg-[#1a1a1d] border border-[#26262a] hover:border-[#3a3a40] text-white rounded-xl py-3.5 px-4 font-medium text-sm transition-all flex items-center justify-center gap-3 cursor-pointer min-h-[50px] active:scale-[0.99]"
                            >
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span className="text-white text-sm font-medium">Sign up with Google</span>
                            </button>

                            {/* OR Divider */}
                            <div className="w-full flex items-center justify-center gap-4 my-6">
                                <div className="flex-1 h-[1px] bg-[#1f1f23]" />
                                <span className="text-[11px] text-[#6b7280] font-semibold tracking-wider uppercase">OR</span>
                                <div className="flex-1 h-[1px] bg-[#1f1f23]" />
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="w-full space-y-4">
                                {/* Full Name */}
                                <div className="flex flex-col text-left">
                                    <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                                        Full name
                                    </label>
                                    <input
                                        id="fullName"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        className="w-full bg-[#0d0d0f] border border-[#222225] focus:border-[#44444a] text-white text-sm placeholder-[#555] rounded-xl px-4 py-3.5 outline-none transition-all"
                                    />
                                </div>

                                {/* Select Role */}
                                <div className="flex flex-col text-left">
                                    <label htmlFor="role" className="block text-sm font-medium text-white mb-2">
                                        Role
                                    </label>
                                    <div className="relative w-full">
                                        <select
                                            id="role"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="w-full bg-[#0d0d0f] border border-[#222225] focus:border-[#44444a] text-white text-sm rounded-xl px-4 py-3.5 pr-10 outline-none appearance-none cursor-pointer transition-all"
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r.value} value={r.value} className="bg-[#141414] text-white">
                                                    {r.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex flex-col text-left">
                                    <label htmlFor="emailAddress" className="block text-sm font-medium text-white mb-2">
                                        Email
                                    </label>
                                    <input
                                        id="emailAddress"
                                        type="email"
                                        required
                                        autoComplete="off"
                                        value={emailAddress}
                                        onChange={(e) => setEmailAddress(e.target.value)}
                                        placeholder="Your email address"
                                        className="w-full bg-[#0d0d0f] border border-[#222225] focus:border-[#44444a] text-white text-sm placeholder-[#555] rounded-xl px-4 py-3.5 outline-none transition-all"
                                    />
                                </div>

                                {/* Password */}
                                <div className="flex flex-col text-left">
                                    <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                                        Password
                                    </label>
                                    <div className="relative w-full">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Your password"
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
                                        Confirm password
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

                                {/* Terms and Conditions Allowance */}
                                <div
                                    onClick={() => setAgreeTerms(!agreeTerms)}
                                    className="flex items-start gap-2.5 pt-1 text-left cursor-pointer group select-none"
                                >
                                    <div
                                        className={`mt-0.5 w-4 h-4 min-w-[16px] min-h-[16px] max-w-[16px] max-h-[16px] rounded flex items-center justify-center transition-colors shrink-0 border ${agreeTerms
                                            ? 'bg-[#522C69] border-[#522C69]'
                                            : 'bg-[#121214] border-white/20 group-hover:border-white/40'
                                        }`}
                                    >
                                        {agreeTerms && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                                    </div>
                                    <span className="text-xs text-[#9ca3af] leading-relaxed">
                                        I agree to the{' '}
                                        <a
                                            href="/terms"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#522C69] hover:text-[#663782] underline font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Terms of Service
                                        </a>{' '}
                                        and{' '}
                                        <a
                                            href="/privacy"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#522C69] hover:text-[#663782] underline font-medium"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Privacy Policy
                                        </a>.
                                    </span>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !fullName || !emailAddress || !password || !confirmPassword || !agreeTerms}
                                    className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-200 disabled:bg-[#1c1c1f] disabled:text-gray-500 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all mt-6 cursor-pointer min-h-[48px] flex items-center justify-center gap-2 active:scale-[0.99] shadow-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin text-black" />
                                            <span>Creating account...</span>
                                        </>
                                    ) : (
                                        <span>Sign up</span>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Step 2: Verification Code Form */
                        <form onSubmit={handleVerifyCode} className="w-full space-y-4">
                            <div className="flex flex-col text-left">
                                <label htmlFor="code" className="block text-sm font-medium text-white mb-2">
                                    Verification code
                                </label>
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

                            <button
                                type="submit"
                                disabled={loading || !code}
                                className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-200 disabled:bg-[#1c1c1f] disabled:text-gray-500 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all mt-6 cursor-pointer min-h-[48px] flex items-center justify-center gap-2 active:scale-[0.99] shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-black" />
                                        <span>Verifying code...</span>
                                    </>
                                ) : (
                                    <span>Complete Sign Up</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer link */}
                    <div className="mt-8 text-center text-sm text-[#9ca3af]">
                        <span>Already have an account? </span>
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
                <div className="absolute bottom-10 left-10 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

                {/* Top Brand Bar */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="NepalCasts" className="w-9 h-9 object-contain" />
                        <span className="font-extrabold text-white text-lg tracking-tight">NepalCasts</span>
                    </div>
                    <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-300">
                        Join Network
                    </span>
                </div>

                {/* Center Content Showcase */}
                <div className="relative z-10 max-w-lg space-y-6 my-auto">
                    <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white text-xs font-semibold">
                        <span>Launch Your Cinema Career</span>
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.25]">
                        Build your professional profile & get discovered.
                    </h2>

                    <p className="text-sm xl:text-base text-gray-400 leading-relaxed font-normal">
                        Showcase your headshots, showreels, awards, and skills to casting directors and top production agencies in Nepal.
                    </p>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white mb-2">
                                <Film className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-sm font-bold text-white">Digital Portfolio</p>
                            <p className="text-xs text-gray-400 font-normal">Headshots, media reels & bios.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white mb-2">
                                <Star className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-sm font-bold text-white">Direct Auditions</p>
                            <p className="text-xs text-gray-400 font-normal">Apply in one click anytime.</p>
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
