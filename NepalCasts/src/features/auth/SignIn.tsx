import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignIn, useUser } from '@clerk/clerk-react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Check, Clapperboard, Users, Sparkles, ChevronLeft } from 'lucide-react';
import SEO from '../../components/SEO';

interface SignInProps {
  onNavigate?: (page: string, param?: any) => void;
  showAlert?: (message: string, type?: 'success' | 'error') => void;
}

export default function SignIn(_props: SignInProps) {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn, isLoaded: userLoaded } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  // If already signed in, navigate to home screen (or redirect_url if present)
  useEffect(() => {
    if (userLoaded && isSignedIn) {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect_url');
      if (redirectUrl && !redirectUrl.includes('/sign') && !redirectUrl.includes('/auth') && !redirectUrl.includes('/forgot') && !redirectUrl.includes('/reset')) {
        navigate(redirectUrl, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [userLoaded, isSignedIn, navigate]);

  // Social OAuth Handler - Google Only
  const handleSocialSignIn = async (strategy: 'oauth_google' = 'oauth_google') => {
    if (!isLoaded || loading || socialLoading) return;
    setError(null);
    setSocialLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect_url');
      const target = (redirectUrl && !redirectUrl.includes('/sign') && !redirectUrl.includes('/auth') && !redirectUrl.includes('/forgot') && !redirectUrl.includes('/reset')) ? redirectUrl : '/';
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: target,
      });
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const isRateLimit = err?.errors?.[0]?.code === 'rate_limit_exceeded';
      const msg = isRateLimit
        ? 'Too many attempts. Clerk rate limits repeated clicks—please wait 1-2 minutes before trying again.'
        : err?.errors?.[0]?.message || 'Google sign in failed. Please try again.';
      setError(msg);
      setSocialLoading(false);
    }
  };

  // Email & Password Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !email || !password) return;
    if (!agreeTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect_url');
        if (redirectUrl && !redirectUrl.includes('/sign') && !redirectUrl.includes('/auth') && !redirectUrl.includes('/forgot') && !redirectUrl.includes('/reset')) {
          navigate(redirectUrl);
        } else {
          navigate('/');
        }
      } else {
        console.log('Sign in status:', result);
        setError('Sign in incomplete. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Sign In Error:', err);
      let msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid email or password.';
      if (msg.toLowerCase().includes('captcha')) {
        msg = 'CAPTCHA challenge failed. Please disable ad-blockers to sign in.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect_url');
      if (redirectUrl && !redirectUrl.includes('/sign') && !redirectUrl.includes('/auth') && !redirectUrl.includes('/forgot') && !redirectUrl.includes('/reset')) {
        navigate(redirectUrl);
        return;
      }
    } catch (e) { }

    try {
      const lastPage = sessionStorage.getItem('last_non_auth_path');
      if (lastPage && !lastPage.includes('/sign') && !lastPage.includes('/auth') && !lastPage.includes('/forgot') && !lastPage.includes('/reset')) {
        navigate(lastPage);
        return;
      }
    } catch (e) { }

    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FAF8F4] text-[#202923] font-sans selection:bg-[#194332] selection:text-white relative overflow-hidden">
      <SEO title="Sign In | NepalCasts" description="Sign in to continue your journey in casting, talent and creativity." noindex />

      {/* Left Column: Form (Full width on mobile, dedicated 480px-540px column on laptop) */}
      <div className="w-full lg:w-[480px] xl:w-[540px] shrink-0 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 relative z-10 bg-[#FAF8F4] lg:border-r lg:border-[#E7E5E0] overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between min-h-[44px] mb-8">
          <button
            onClick={handleBack}
            type="button"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9] transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
          </button>

          <div className="text-xs sm:text-[13px] text-[#626860] font-medium select-none flex items-center">
            <span>New here?</span>
            <Link
              to="/signup"
              replace
              className="text-[#194332] font-semibold hover:text-[#102F28] transition-colors ml-1.5 cursor-pointer"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Center Screen Content */}
        <div className="my-auto py-4">
          {/* Heading */}
          <div className="text-left mb-6 sm:mb-8">
            <h1 className="text-[32px] sm:text-[36px] font-display font-semibold text-[#202923] tracking-tight leading-tight">
              <span>Welcome</span> <span className="text-[#194332]">Back</span>
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#626860] mt-2 font-normal leading-relaxed">
              Sign in to continue your journey in casting, talent and creativity.
            </p>
          </div>

          {/* Clerk CAPTCHA Mount Element */}
          <div id="clerk-captcha" className="w-full flex justify-center" />

          {/* Error Message */}
          {error && (
            <p className="w-full text-rose-400 text-xs sm:text-[13px] font-medium mb-3.5 text-left leading-relaxed">
              {error}
            </p>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-3.5 text-left">
            {/* Email Address */}
            <div className="relative flex items-center h-[52px] sm:h-[54px] bg-white border border-[#E7E5E0] hover:border-[#D5D1C7] focus-within:border-[#194332] focus-within:ring-2 focus-within:ring-[#194332]/15 transition-all rounded-xl px-4 shadow-2xs">
              <Mail className="w-5 h-5 text-[#777C75] shrink-0 stroke-[1.8]" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-transparent border-none text-[#202923] text-[14px] placeholder:text-[#777C75] outline-none ml-3 !pl-0"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="relative flex items-center h-[52px] sm:h-[54px] bg-white border border-[#E7E5E0] hover:border-[#D5D1C7] focus-within:border-[#194332] focus-within:ring-2 focus-within:ring-[#194332]/15 transition-all rounded-xl px-4 shadow-2xs">
                <Lock className="w-5 h-5 text-[#777C75] shrink-0 stroke-[1.8]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent border-none text-[#202923] text-[14px] placeholder:text-[#777C75] outline-none ml-3 pr-2 !pl-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#777C75] hover:text-[#202923] transition-colors cursor-pointer p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5 stroke-[1.8]" />
                  ) : (
                    <EyeOff className="w-5 h-5 stroke-[1.8]" />
                  )}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right pt-0.5">
                <Link
                  to="/forgot-password"
                  replace
                  className="text-[13px] font-semibold text-[#194332] hover:text-[#102F28] transition-colors inline-block cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div
              onClick={() => setAgreeTerms(!agreeTerms)}
              className="flex items-start gap-2.5 pt-1 text-left cursor-pointer group select-none"
            >
              <div
                className={`mt-0.5 w-4 h-4 min-w-[16px] min-h-[16px] rounded flex items-center justify-center transition-colors shrink-0 border ${agreeTerms
                    ? 'bg-[#194332] border-[#194332]'
                    : 'bg-white border-[#E7E5E0] group-hover:border-[#D5D1C7]'
                  }`}
              >
                {agreeTerms && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-xs text-[#626860] leading-relaxed">
                I agree to the{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#194332] hover:text-[#102F28] underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#194332] hover:text-[#102F28] underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </div>

            {/* Primary Action Button ("Sign In ->") */}
            <button
              type="submit"
              disabled={loading || !email || !password || !agreeTerms}
              className="w-full h-[52px] sm:h-[54px] mt-5 bg-[#194332] hover:bg-[#102F28] active:scale-[0.99] text-white font-semibold text-[15px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Social Logins */}
          <div className="w-full mt-6 mb-2">
            {/* Divider */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E7E5E0]" />
              </div>
              <div className="relative px-3 bg-[#FAF8F4] text-[12px] text-[#777C75] font-normal select-none">
                Or continue with
              </div>
            </div>

            {/* Social Buttons Row - Google Only */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleSocialSignIn('oauth_google')}
                disabled={loading || socialLoading}
                className="w-[52px] h-[52px] rounded-full bg-white hover:bg-[#F3F0E9] border border-[#E7E5E0] hover:border-[#D5D1C7] flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                title="Continue with Google"
                aria-label="Continue with Google"
              >
                {socialLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#194332]" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
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
              <linearGradient id="waveBgSignIn" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F3F0E9" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FAF8F4" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              d="M-20 140 C 20 200, 70 245, 170 260 C 270 275, 340 250, 440 320 L -20 320 Z"
              fill="url(#waveBgSignIn)"
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
            <span>Nepal's Premier Casting Platform</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-display font-semibold text-[#202923] tracking-tight leading-[1.25]">
            Where Nepali cinema talent meets opportunity.
          </h2>

          <p className="text-sm xl:text-base text-[#626860] leading-relaxed font-normal">
            Connect directly with leading casting directors, producers, actors, and cinema professionals across Nepal.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-white border border-[#E7E5E0] shadow-card space-y-1 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#EAF2ED] border border-[#194332]/20 flex items-center justify-center text-[#194332] mb-2">
                <Clapperboard className="w-4 h-4 text-[#194332]" />
              </div>
              <p className="text-sm font-bold text-[#202923]">Live Casting Calls</p>
              <p className="text-xs text-[#626860] font-normal">Apply to verified film & TV auditions.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E7E5E0] shadow-card space-y-1 text-left">
              <div className="w-8 h-8 rounded-xl bg-[#EAF2ED] border border-[#194332]/20 flex items-center justify-center text-[#194332] mb-2">
                <Users className="w-4 h-4 text-[#194332]" />
              </div>
              <p className="text-sm font-bold text-[#202923]">Verified Creators</p>
              <p className="text-xs text-[#626860] font-normal">Discover top directors & actors.</p>
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
              <linearGradient id="waveBgSignInDesk" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAF8F4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#E7E5E0" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <path
              d="M-20 120 C 180 180, 360 220, 520 200 C 660 180, 740 220, 840 280 L -20 280 Z"
              fill="url(#waveBgSignInDesk)"
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
