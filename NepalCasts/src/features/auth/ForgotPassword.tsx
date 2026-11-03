import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ChevronLeft, Clapperboard, Users, Sparkles } from 'lucide-react';
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
    if (onNavigate) {
      onNavigate('signin');
      return;
    }
    navigate('/signin', { replace: true });
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
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Failed to send reset code. Please check your email.';
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
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Invalid code or password requirements not met.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FAF8F4] text-[#202923] font-sans selection:bg-[#194332] selection:text-white relative overflow-hidden">
      <SEO title="Forgot Password | NepalCasts" description="Reset your NepalCasts account password." noindex />

      {/* Left Column: Form */}
      <div className="w-full lg:w-[480px] xl:w-[540px] shrink-0 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 relative z-10 bg-[#FAF8F4] lg:border-r lg:border-[#E7E5E0] overflow-y-auto overflow-x-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center min-h-[44px] mb-6">
          <button
            onClick={handleBack}
            type="button"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9] transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
          </button>
        </div>

        {/* Center Screen Content */}
        <div className="my-auto py-4">
          {/* Error Message */}
          {error && (
            <p className="w-full text-rose-400 text-xs sm:text-[13px] font-medium mb-3.5 text-center leading-relaxed">
              {error}
            </p>
          )}

          {/* STEP 1: Enter Email */}
          {!successfulCreation ? (
            <div className="w-full flex flex-col items-center text-center">
              {/* Padlock Graphic Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-[#EAF2ED] border border-[#194332]/20 flex items-center justify-center relative shadow-xs">
                  <Lock className="w-8 h-8 text-[#194332]" strokeWidth={2.2} />
                </div>
              </div>

              <h1 className="text-[32px] sm:text-[34px] font-display font-semibold text-[#202923] tracking-tight leading-tight">
                Forgot <span className="text-[#194332]">Password?</span>
              </h1>
              <p className="text-[13px] sm:text-[14px] text-[#626860] mt-2.5 mb-8 max-w-[340px] font-normal leading-relaxed">
                No worries. Enter your email address and we’ll send you a verification code to reset your password.
              </p>

              {/* Form */}
              <form onSubmit={handleSendCode} className="w-full space-y-4 text-left">
                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-white border border-[#E7E5E0] hover:border-[#D5D1C7] focus-within:border-[#194332] focus-within:ring-2 focus-within:ring-[#194332]/15 shadow-2xs transition-all rounded-xl px-4">
                  <Mail className="w-5 h-5 text-[#777C75] shrink-0 stroke-[1.8]" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-transparent border-none text-[#202923] text-[14px] placeholder:text-[#777C75] outline-none ml-3 !pl-0"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-[52px] sm:h-[54px] mt-4 bg-[#194332] hover:bg-[#102F28] shadow-xs active:scale-[0.99] text-white font-semibold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Sending code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Code</span>
                      <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* STEP 2: Enter Verification Code & New Password */
            <div className="w-full text-left">
              <div className="mb-6">
                <h1 className="text-[32px] font-display font-semibold text-[#202923] tracking-tight">
                  Reset <span className="text-[#194332]">Password</span>
                </h1>
                <p className="text-[13px] text-[#626860] mt-2 font-normal leading-relaxed">
                  We sent a verification code to <span className="text-[#202923] font-medium">{email}</span>. Enter it below with your new password.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-white border border-[#E7E5E0] hover:border-[#D5D1C7] focus-within:border-[#194332] focus-within:ring-2 focus-within:ring-[#194332]/15 shadow-2xs transition-all rounded-xl px-4">
                  <Mail className="w-5 h-5 text-[#777C75] shrink-0 stroke-[1.8]" />
                  <input
                    id="reset-code"
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit verification code"
                    className="w-full bg-transparent border-none text-[#202923] text-base tracking-widest font-mono placeholder:font-sans placeholder:tracking-normal placeholder:text-[#777C75] outline-none ml-3 !pl-0"
                  />
                </div>

                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-white border border-[#E7E5E0] hover:border-[#D5D1C7] focus-within:border-[#194332] focus-within:ring-2 focus-within:ring-[#194332]/15 shadow-2xs transition-all rounded-xl px-4">
                  <Lock className="w-5 h-5 text-[#777C75] shrink-0 stroke-[1.8]" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="w-full bg-transparent border-none text-[#202923] text-[14px] placeholder:text-[#777C75] outline-none ml-3 pr-2 !pl-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#777C75] hover:text-[#202923] transition-colors cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-white border border-[#E7E5E0] hover:border-[#D5D1C7] focus-within:border-[#194332] focus-within:ring-2 focus-within:ring-[#194332]/15 shadow-2xs transition-all rounded-xl px-4">
                  <Lock className="w-5 h-5 text-[#777C75] shrink-0 stroke-[1.8]" />
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-transparent border-none text-[#202923] text-[14px] placeholder:text-[#777C75] outline-none ml-3 pr-2 !pl-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[#777C75] hover:text-[#202923] transition-colors cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !code || !password || !confirmPassword}
                  className="w-full h-[52px] sm:h-[54px] mt-4 bg-[#194332] hover:bg-[#102F28] shadow-xs active:scale-[0.99] text-white font-semibold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Area: Slogan & Copyright */}
        <div className="pt-6 flex flex-col select-none relative z-10">
          <div className="text-left pointer-events-none">
            <div className="space-y-[3px]">
              <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#777C75] uppercase leading-none">PEOPLE</p>
              <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#777C75] uppercase leading-none">PROJECTS</p>
              <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#777C75] uppercase leading-none">OPPORTUNITIES</p>
              <div className="w-7 h-[3px] bg-[#D4A373] mt-2 rounded-full" />
            </div>
          </div>
          <div className="w-full text-left text-xs text-[#777C75] mt-4">
            © 2026 NepalCasts Inc. All rights reserved.
          </div>
        </div>

        {/* Bottom Organic Wave Graphic (Mobile View & Form Panel Background) */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-[260px] sm:h-[300px] pointer-events-none z-0 overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 420 320"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveBgForgotMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F3F0E9" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FAF8F4" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d="M-20 140 C 20 200, 70 245, 170 260 C 270 275, 340 250, 440 320 L -20 320 Z"
              fill="url(#waveBgForgotMobile)"
            />
            <path
              d="M-20 190 C 40 235, 120 275, 260 270 C 340 265, 390 285, 440 320"
              stroke="#D5D1C7"
              strokeWidth="1.2"
              strokeOpacity="0.3"
            />
            <path
              d="M-20 140 C 20 200, 70 245, 170 260 C 270 275, 340 250, 440 320"
              stroke="#E7E5E0"
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
          </svg>
        </div>
      </div>

      {/* Right Side: Cinematic Showcase Panel (Laptops & Desktops) */}
      <div className="hidden lg:flex flex-1 relative bg-[#F3F0E9] flex-col justify-between p-12 xl:p-16 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#194332]/5 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#D4A373]/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Brand Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NepalCasts" className="w-9 h-9 object-contain" />
            <span className="font-extrabold text-[#202923] text-lg tracking-tight">NepalCasts</span>
          </div>
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white border border-[#E7E5E0] text-[#414840]">
            Cinema Network
          </span>
        </div>

        {/* Center Content Showcase */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2ED] border border-[#194332]/20 text-[#194332] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#194332]" />
            <span>Secure Account Recovery</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-display font-semibold text-[#202923] tracking-tight leading-[1.25]">
            Fast, secure access back to your casting network.
          </h2>

          <p className="text-sm xl:text-base text-[#626860] leading-relaxed font-normal">
            Reset your credentials securely and get back to discovering auditions, talent, and production opportunities.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-[#E7E5E0] shadow-card space-y-1 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#EAF2ED] border border-[#194332]/20 flex items-center justify-center text-[#194332] mb-2">
                <Clapperboard className="w-4 h-4 text-[#194332]" />
              </div>
              <p className="text-sm font-bold text-[#202923]">Encrypted & Safe</p>
              <p className="text-xs text-[#626860] font-normal">Industry-standard authentication.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E7E5E0] shadow-card space-y-1 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#EAF2ED] border border-[#194332]/20 flex items-center justify-center text-[#194332] mb-2">
                <Users className="w-4 h-4 text-[#194332]" />
              </div>
              <p className="text-sm font-bold text-[#202923]">Live Support</p>
              <p className="text-xs text-[#626860] font-normal">Our team is always here to assist.</p>
            </div>
          </div>
        </div>

        {/* Bottom Organic Wave Graphic in Showcase */}
        <div className="absolute bottom-0 left-0 right-0 w-full h-[280px] pointer-events-none z-0 overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 800 280"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveBgForgotDesk" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAF8F4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#E7E5E0" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path
              d="M-20 120 C 180 180, 360 220, 520 200 C 660 180, 740 220, 840 280 L -20 280 Z"
              fill="url(#waveBgForgotDesk)"
            />
            <path
              d="M-20 120 C 180 180, 360 220, 520 200 C 660 180, 740 220, 840 280"
              stroke="#D5D1C7"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
          </svg>
        </div>

        {/* Bottom Footer Details */}
        <div className="relative z-10 pt-6 border-t border-[#E7E5E0] flex items-center justify-between text-xs text-[#777C75]">
          <span>© 2026 NepalCasts Inc.</span>
          <span className="text-[#626860] font-medium">Kathmandu, Nepal</span>
        </div>
      </div>
    </div>
  );
}
