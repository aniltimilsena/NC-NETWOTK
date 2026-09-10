import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    <div className="min-h-screen w-full flex bg-[#0c0e15] text-white font-sans selection:bg-[#7f4ef8] selection:text-white relative overflow-hidden">
      <SEO title="Forgot Password | NepalCasts" description="Reset your NepalCasts account password." noindex />

      {/* Left Column: Form */}
      <div className="w-full lg:w-[480px] xl:w-[540px] shrink-0 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 relative z-10 bg-[#0c0e15] lg:border-r lg:border-white/[0.06] overflow-y-auto overflow-x-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center min-h-[44px] mb-6">
          <button
            onClick={handleBack}
            type="button"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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
              {/* Glowing Purple Padlock Graphic Badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#8b5cf6]/25 to-[#3b0764]/40 border border-[#8b5cf6]/40 flex items-center justify-center shadow-[0_0_35px_rgba(139,92,246,0.3)] relative">
                  <div className="absolute -top-1 -right-1 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
                  </div>
                  <div className="absolute top-2 right-1 text-[#c084fc] font-bold text-xs select-none">
                    ✦
                  </div>
                  <div className="absolute -top-1.5 left-3 text-[#a855f7] font-bold text-[10px] select-none">
                    ✦
                  </div>
                  <Lock className="w-8 h-8 text-[#c084fc]" strokeWidth={2.2} />
                </div>
              </div>

              <h1 className="text-[32px] sm:text-[34px] font-extrabold text-white tracking-tight leading-tight">
                Forgot <span className="text-[#8b5cf6]">Password?</span>
              </h1>
              <p className="text-[13px] sm:text-[14px] text-[#7e8697] mt-2.5 mb-8 max-w-[340px] font-normal leading-relaxed">
                No worries. Enter your email address and we’ll send you a verification code to reset your password.
              </p>

              {/* Form */}
              <form onSubmit={handleSendCode} className="w-full space-y-4 text-left">
                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-[#151821] border border-white/[0.08] hover:border-white/15 focus-within:border-[#8f64f8] focus-within:ring-2 focus-within:ring-[#8f64f8]/20 transition-all rounded-xl px-4">
                  <Mail className="w-5 h-5 text-[#737b8d] shrink-0 stroke-[1.8]" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-transparent border-none text-white text-[14px] placeholder:text-[#737b8d] outline-none ml-3 !pl-0"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-[52px] sm:h-[54px] mt-4 bg-[#7f4ef8] hover:bg-[#7241eb] active:scale-[0.99] text-white font-semibold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
                <h1 className="text-[32px] font-extrabold text-white tracking-tight">
                  Reset <span className="text-[#8f64f8]">Password</span>
                </h1>
                <p className="text-[13px] text-[#7e8697] mt-2 font-normal leading-relaxed">
                  We sent a verification code to <span className="text-white font-medium">{email}</span>. Enter it below with your new password.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-[#151821] border border-white/[0.08] hover:border-white/15 focus-within:border-[#8f64f8] focus-within:ring-2 focus-within:ring-[#8f64f8]/20 transition-all rounded-xl px-4">
                  <Mail className="w-5 h-5 text-[#737b8d] shrink-0 stroke-[1.8]" />
                  <input
                    id="reset-code"
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit verification code"
                    className="w-full bg-transparent border-none text-white text-base tracking-widest font-mono placeholder:font-sans placeholder:tracking-normal placeholder:text-[#737b8d] outline-none ml-3 !pl-0"
                  />
                </div>

                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-[#151821] border border-white/[0.08] hover:border-white/15 focus-within:border-[#8f64f8] focus-within:ring-2 focus-within:ring-[#8f64f8]/20 transition-all rounded-xl px-4">
                  <Lock className="w-5 h-5 text-[#737b8d] shrink-0 stroke-[1.8]" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="w-full bg-transparent border-none text-white text-[14px] placeholder:text-[#737b8d] outline-none ml-3 pr-2 !pl-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#737b8d] hover:text-white transition-colors cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative flex items-center h-[52px] sm:h-[54px] bg-[#151821] border border-white/[0.08] hover:border-white/15 focus-within:border-[#8f64f8] focus-within:ring-2 focus-within:ring-[#8f64f8]/20 transition-all rounded-xl px-4">
                  <Lock className="w-5 h-5 text-[#737b8d] shrink-0 stroke-[1.8]" />
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-transparent border-none text-white text-[14px] placeholder:text-[#737b8d] outline-none ml-3 pr-2 !pl-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[#737b8d] hover:text-white transition-colors cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !code || !password || !confirmPassword}
                  className="w-full h-[52px] sm:h-[54px] mt-4 bg-[#7f4ef8] hover:bg-[#7241eb] active:scale-[0.99] text-white font-semibold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
              <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#606877] uppercase leading-none">PEOPLE</p>
              <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#606877] uppercase leading-none">PROJECTS</p>
              <p className="text-[9.5px] font-bold tracking-[0.22em] text-[#606877] uppercase leading-none">OPPORTUNITIES</p>
              <div className="w-7 h-[3px] bg-[#8f64f8] mt-2 rounded-full" />
            </div>
          </div>
          <div className="w-full text-left text-xs text-[#525968] mt-4">
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
                <stop offset="0%" stopColor="#25123d" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#1a0c2c" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#10071c" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <path
              d="M-20 140 C 20 200, 70 245, 170 260 C 270 275, 340 250, 440 320 L -20 320 Z"
              fill="url(#waveBgForgotMobile)"
            />
            <path
              d="M-20 190 C 40 235, 120 275, 260 270 C 340 265, 390 285, 440 320"
              stroke="#7f4ef8"
              strokeWidth="1.2"
              strokeOpacity="0.25"
            />
            <path
              d="M-20 140 C 20 200, 70 245, 170 260 C 270 275, 340 250, 440 320"
              stroke="#9d74fa"
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />
          </svg>
        </div>
      </div>

      {/* Right Side: Cinematic Showcase Panel (Laptops & Desktops) */}
      <div className="hidden lg:flex flex-1 relative bg-[#07080c] flex-col justify-between p-12 xl:p-16 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#7f4ef8]/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#8f64f8]/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Brand Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="NepalCasts" className="w-9 h-9 object-contain" />
            <span className="font-extrabold text-white text-lg tracking-tight">NepalCasts</span>
          </div>
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-gray-300">
            Cinema Network
          </span>
        </div>

        {/* Center Content Showcase */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7f4ef8]/15 border border-[#8f64f8]/30 text-[#a785fc] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#8f64f8]" />
            <span>Secure Account Recovery</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.25]">
            Fast, secure access back to your casting network.
          </h2>

          <p className="text-sm xl:text-base text-gray-400 leading-relaxed font-normal">
            Reset your credentials securely and get back to discovering auditions, talent, and production opportunities.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#7f4ef8]/15 border border-[#8f64f8]/20 flex items-center justify-center text-[#a785fc] mb-2">
                <Clapperboard className="w-4 h-4 text-[#8f64f8]" />
              </div>
              <p className="text-sm font-bold text-white">Encrypted & Safe</p>
              <p className="text-xs text-gray-400 font-normal">Industry-standard authentication.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#7f4ef8]/15 border border-[#8f64f8]/20 flex items-center justify-center text-[#a785fc] mb-2">
                <Users className="w-4 h-4 text-[#8f64f8]" />
              </div>
              <p className="text-sm font-bold text-white">Live Support</p>
              <p className="text-xs text-gray-400 font-normal">Our team is always here to assist.</p>
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
                <stop offset="0%" stopColor="#25123d" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#1a0c2c" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10071c" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path
              d="M-20 120 C 180 180, 360 220, 520 200 C 660 180, 740 220, 840 280 L -20 280 Z"
              fill="url(#waveBgForgotDesk)"
            />
            <path
              d="M-20 120 C 180 180, 360 220, 520 200 C 660 180, 740 220, 840 280"
              stroke="#9d74fa"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
          </svg>
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
