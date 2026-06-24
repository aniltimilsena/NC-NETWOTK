import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Lock, Eye, EyeOff, Check, AlertCircle, ArrowLeft, Loader2, Sparkles
} from 'lucide-react';
import Logo from '../components/ui/Logo';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import SEO from '../components/SEO';

import { signInUser, ensureUserProfile, logoutUser, sendPasswordReset } from '../services/auth';
import OtpInput from '../components/ui/OtpInput';
import apiClient from '../api/client';
import { logLoginAttempt } from '../utils/security';

export default function SignIn({ onNavigate, showAlert }) {
  const navigate = useNavigate();
  // view states: 'signin' | 'forgot' | 'forgot_success'
  const [view, setView] = useState('signin');
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Field validation states
  const [validation, setValidation] = useState({
    email: { valid: null, msg: '' },
    password: { valid: null, msg: '' }
  });

  // Real-time validation handlers
  const handleEmailChange = (val) => {
    setForm(prev => ({ ...prev, email: val }));
    if (!val) {
      setValidation(prev => ({ ...prev, email: { valid: false, msg: 'Email is required.' } }));
      return;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) {
      setValidation(prev => ({ ...prev, email: { valid: false, msg: 'Please enter a valid email address.' } }));
    } else {
      setValidation(prev => ({ ...prev, email: { valid: true, msg: '' } }));
    }
  };

  const handlePasswordChange = (val) => {
    setForm(prev => ({ ...prev, password: val }));
    if (!val) {
      setValidation(prev => ({ ...prev, password: { valid: false, msg: 'Password is required.' } }));
      return;
    }
    if (val.length < 8) {
      setValidation(prev => ({ ...prev, password: { valid: false, msg: 'Password must be at least 8 characters.' } }));
    } else {
      setValidation(prev => ({ ...prev, password: { valid: true, msg: '' } }));
    }
  };

  // Google redirect handler
  useEffect(() => {
    if (!sessionStorage.getItem('nc_google_redirect')) return;
    let isMounted = true;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          sessionStorage.removeItem('nc_google_redirect');
          const profileRes = await ensureUserProfile(result.user);
          if (!profileRes.success) {
            throw new Error(profileRes.error || "Failed to initialize user profile");
          }
          localStorage.removeItem('login_attempts');
          localStorage.removeItem('login_lockout_until');
          onNavigate('home');
        } else {
          sessionStorage.removeItem('nc_google_redirect');
        }
      } catch (err) {
        console.error("Redirect auth error:", err);
        sessionStorage.removeItem('nc_google_redirect');
        if (isMounted) {
          setError('Google Sign-In failed: ' + (err instanceof Error ? err.message : String(err)));
          setIsLoading(false);
        }
      }
    };
    checkRedirect();
    return () => { isMounted = false; };
  }, [onNavigate]);

  // Lockout countdown timer
  useEffect(() => {
    const lockoutUntil = localStorage.getItem('login_lockout_until');
    if (lockoutUntil) {
      const remainingMs = parseInt(lockoutUntil, 10) - Date.now();
      if (remainingMs > 0) {
        setLockoutTimeLeft(Math.ceil(remainingMs / 1000));
      } else {
        localStorage.removeItem('login_lockout_until');
      }
    }
  }, []);

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      const lockoutUntil = localStorage.getItem('login_lockout_until');
      if (lockoutUntil) {
        const remainingMs = parseInt(lockoutUntil, 10) - Date.now();
        if (remainingMs > 0) {
          setLockoutTimeLeft(Math.ceil(remainingMs / 1000));
        } else {
          setLockoutTimeLeft(0);
          localStorage.removeItem('login_lockout_until');
        }
      } else {
        setLockoutTimeLeft(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  // 2FA states & verification
  const [show2fa, setShow2fa] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [tempCredentials, setTempCredentials] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState('sms');
  const [twoFactorDestination, setTwoFactorDestination] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [resendActive, setResendActive] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isShake, setIsShake] = useState(false);

  useEffect(() => {
    if (show2fa && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (show2fa && countdown === 0) {
      setResendActive(true);
    }
  }, [countdown, show2fa]);

  // Auto-submit when 6 digits are filled
  useEffect(() => {
    if (show2fa && !useBackupCode && verificationCode.length === 6 && !isLoading) {
      const triggerVerify = async () => {
        setIsLoading(true);
        setTwoFactorError('');
        try {
          const res = await apiClient.post('/2fa/verify-otp', {
            userId: pendingUserId,
            code: verificationCode
          });

          if (res.data.success && res.data.customToken) {
            await signInWithCustomToken(auth, res.data.customToken);
            localStorage.removeItem('login_attempts');
            localStorage.removeItem('login_lockout_until');
            const logRes = await logLoginAttempt(tempCredentials.email, 'success');
            if (logRes?.suspicious) {
              localStorage.setItem('nc_suspicious_login', 'true');
            }
            onNavigate('home');
          } else {
            setTwoFactorError(res.data.error || 'Invalid code.');
            setIsShake(true);
            setTimeout(() => setIsShake(false), 500);
            setIsLoading(false);
          }
        } catch (err) {
          console.error("2FA verify login error:", err);
          setTwoFactorError(err.response?.data?.error || 'Verification failed. Try again.');
          setIsShake(true);
          setTimeout(() => setIsShake(false), 500);
          setIsLoading(false);
        }
      };
      triggerVerify();
    }
  }, [verificationCode, useBackupCode, show2fa, pendingUserId]);

  const handleResend2faCode = async () => {
    setIsLoading(true);
    setTwoFactorError('');
    try {
      const res = await apiClient.post('/2fa/send-login-otp', {
        userId: pendingUserId,
        method: twoFactorMethod
      });
      if (res.data.success) {
        setCountdown(60);
        setResendActive(false);
        setVerificationCode('');
        showAlert('Verification code resent!', 'success');
      } else {
        setTwoFactorError(res.data.error || 'Failed to resend code.');
      }
    } catch (err) {
      console.error("2FA resend error:", err);
      setTwoFactorError(err.response?.data?.error || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e?.preventDefault();

    // Check lockout first
    const lockoutUntil = localStorage.getItem('login_lockout_until');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil, 10)) {
      const remainingSecs = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
      setLockoutTimeLeft(remainingSecs);
      setError(`Too many failed attempts. Locked out for another ${remainingSecs} seconds.`);
      return;
    }

    // Run validation on all fields
    const emailVal = validateEmailLocally(form.email);
    const passVal = validatePasswordLocally(form.password);
    setValidation({ email: emailVal, password: passVal });

    if (!emailVal.valid || !passVal.valid) {
      setError('Please resolve validation errors before logging in.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const { user, error: authError } = await signInUser(form.email, form.password);
    
    if (authError) {
      setIsLoading(false);
      logLoginAttempt(form.email, 'failed').catch(() => {});
      const currentAttempts = parseInt(localStorage.getItem('login_attempts') || '0', 10) + 1;
      localStorage.setItem('login_attempts', currentAttempts.toString());

      if (currentAttempts >= 5) {
        let duration = 60;
        if (currentAttempts === 6) duration = 180;
        else if (currentAttempts >= 7) duration = 600;
        
        const lockoutTime = Date.now() + duration * 1000;
        localStorage.setItem('login_lockout_until', lockoutTime.toString());
        setLockoutTimeLeft(duration);
        setError(`Too many failed attempts. Locked out for ${duration} seconds.`);
      } else {
        const remaining = 5 - currentAttempts;
        setError(`${authError} (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining before lockout)`);
      }
      return;
    }

    if (user) {
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('login_lockout_until');

      try {
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        if (profileSnap.exists() && profileSnap.data().twoFactorEnabled === true) {
          setTempCredentials({ email: form.email, password: form.password });
          setPendingUserId(user.uid);
          
          await logoutUser();
          
          const res = await apiClient.post('/2fa/send-login-otp', {
            userId: user.uid,
            method: profileSnap.data().twoFactorMethod || 'sms'
          });
          
          if (res.data.success) {
            setTwoFactorMethod(res.data.method || 'sms');
            setTwoFactorDestination(res.data.destination);
            setCountdown(60);
            setResendActive(false);
            setVerificationCode('');
            setTwoFactorError('');
            setUseBackupCode(false);
            
            setShow2fa(true);
            setIsLoading(false);
            return;
          } else {
            setError(res.data.error || 'Failed to send verification code.');
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error checking 2FA profile:", err);
      }
      
      const logRes = await logLoginAttempt(form.email, 'success');
      if (logRes?.suspicious) {
        localStorage.setItem('nc_suspicious_login', 'true');
      }
      onNavigate('home');
    }
  };

  const validateEmailLocally = (val) => {
    if (!val) return { valid: false, msg: 'Email is required.' };
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) return { valid: false, msg: 'Please enter a valid email address.' };
    return { valid: true, msg: '' };
  };

  const validatePasswordLocally = (val) => {
    if (!val) return { valid: false, msg: 'Password is required.' };
    if (val.length < 8) return { valid: false, msg: 'Password must be at least 8 characters.' };
    return { valid: true, msg: '' };
  };

  const handleVerify2fa = async (e) => {
    e?.preventDefault();
    if (!verificationCode || verificationCode.length !== (useBackupCode ? 8 : 6)) {
      setTwoFactorError(useBackupCode ? 'Please enter your 8-digit backup code.' : 'Please enter the 6-digit verification code.');
      return;
    }
    setIsLoading(true);
    setTwoFactorError('');

    try {
      const res = await apiClient.post('/2fa/verify-otp', {
        userId: pendingUserId,
        code: verificationCode
      });

      if (res.data.success && res.data.customToken) {
        await signInWithCustomToken(auth, res.data.customToken);
        localStorage.removeItem('login_attempts');
        localStorage.removeItem('login_lockout_until');
        const logRes = await logLoginAttempt(tempCredentials.email, 'success');
        if (logRes?.suspicious) {
          localStorage.setItem('nc_suspicious_login', 'true');
        }
        onNavigate('home');
      } else {
        setTwoFactorError(res.data.error || 'Invalid code.');
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("2FA verify login error:", err);
      setTwoFactorError(err.response?.data?.error || 'Verification failed. Try again.');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (err) {
        if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request')) {
          sessionStorage.setItem('nc_google_redirect', 'true');
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw err;
      }

      if (result && result.user) {
        const profileRes = await ensureUserProfile(result.user);
        if (!profileRes.success) {
          throw new Error(profileRes.error || "Failed to initialize user profile");
        }
        localStorage.removeItem('login_attempts');
        localStorage.removeItem('login_lockout_until');
        if (result.user.email) {
          const logRes = await logLoginAttempt(result.user.email, 'success');
          if (logRes?.suspicious) {
            localStorage.setItem('nc_suspicious_login', 'true');
          }
        }
        onNavigate('home');
      }
    } catch (err) {
      console.error(err);
      let friendlyMessage = err instanceof Error ? err.message : String(err);
      if (err && typeof err === 'object') {
        const code = err.code;
        if (code === 'auth/popup-closed-by-user') {
          friendlyMessage = 'Sign-in cancelled. The Google sign-in window was closed.';
        } else if (code === 'auth/popup-blocked') {
          friendlyMessage = 'The Google login popup was blocked by your browser. Please allow popups for this site.';
        } else if (code === 'auth/cancelled-popup-request') {
          friendlyMessage = 'The sign-in window was closed because another popup request was opened.';
        }
      }
      setError('Google Sign-In failed: ' + friendlyMessage);
      setIsLoading(false);
    }
  };

  const handleSendResetLink = async (e) => {
    e?.preventDefault();
    const emailVal = validateEmailLocally(form.email);
    setValidation(prev => ({ ...prev, email: emailVal }));

    if (!emailVal.valid) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { error: resetError } = await sendPasswordReset(form.email);
      if (resetError) {
        setError(resetError);
      } else {
        setView('forgot_success');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to send password reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Helper validation class resolver
  const getInputStyles = (field) => {
    const status = validation[field]?.valid;
    const common = "w-full bg-[#1a1a1a] text-white placeholder-gray-500 rounded-xl pl-10 pr-10 py-3 text-sm outline-none border transition-all duration-300 ";
    if (status === true) {
      return common + "border-green-500/50 focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]";
    }
    if (status === false) {
      return common + "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]";
    }
    return common + "border-white/5 focus:border-[#00BFFF]/50 focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)]";
  };

  if (show2fa) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00BFFF]/5 rounded-full blur-3xl" />
        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8">
            <Logo onNavigate={onNavigate} size="lg" className="mx-auto mb-6" />
            <h1 className="text-2xl font-black text-white">Two-Factor Verification</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {useBackupCode ? 'Enter one of your 8-digit recovery backup codes' : `Enter the 6-digit code sent to ${twoFactorDestination}`}
            </p>
          </div>
          
          <motion.div 
            animate={isShake ? { x: [-10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.4 } } : {}}
            className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl"
          >
            <form onSubmit={handleVerify2fa} className="space-y-6">
              {twoFactorError && (
                <div className="text-red-500 text-xs text-center bg-red-500/10 py-2.5 rounded-lg border border-red-500/20">
                  {twoFactorError}
                </div>
              )}
              
              {!useBackupCode ? (
                <div>
                  <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2 text-center">Verification Code</label>
                  <OtpInput value={verificationCode} onChange={setVerificationCode} error={!!twoFactorError} />
                </div>
              ) : (
                <div className="text-left">
                  <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2 text-center">Backup Code</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="8-digit code"
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 outline-none focus:border-[#00BFFF] transition-colors text-center font-mono text-xl tracking-[0.3em] font-bold"
                  />
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || (useBackupCode ? verificationCode.length !== 8 : verificationCode.length !== 6)}
                  className="w-full justify-center flex items-center gap-2 bg-gradient-to-r from-[#00bfff] to-[#0080ff] hover:opacity-95 text-black font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Sign In'}
                </button>

                {!useBackupCode && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResend2faCode}
                      disabled={!resendActive || isLoading}
                      className="text-xs text-[#00BFFF] disabled:text-gray-600 font-bold transition-colors py-1"
                    >
                      {resendActive ? 'Resend Code' : `Resend code in ${countdown}s`}
                    </button>
                  </div>
                )}
                
                <div className="flex flex-col gap-2 pt-2 border-t border-white/5 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setVerificationCode('');
                      setTwoFactorError('');
                    }}
                    className="text-center text-xs text-[#00BFFF] hover:underline transition-colors py-1"
                  >
                    {useBackupCode ? 'Use verification code instead' : 'Use backup code instead'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShow2fa(false);
                      setVerificationCode('');
                      setTwoFactorError('');
                      setTempCredentials(null);
                    }}
                    className="w-full text-center text-xs text-gray-500 hover:text-white transition-colors py-1"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row relative overflow-hidden font-sans">
      <SEO 
        title="Sign In | NC Network" 
        description="Access your NC Network account to explore Nepali cinema casting opportunities and talent." 
      />

      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-[#00BFFF]/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* LEFT COLUMN: Cinematic Image (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-16 bg-cover bg-center" style={{ backgroundImage: "url('/cinematic_backstage.png')" }}>
        {/* Dark Cinematic Vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0af5] via-[#0a0a0ad5] to-[#0a0a0a55] z-0"></div>
        
        <div className="flex-1" />
        
        <div className="relative z-10 max-w-md space-y-4 text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-yellow-400 font-semibold w-max"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nepal's Premier Cinema Platform
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]"
          >
            Discover Multiple Talents in one place
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-gray-400 text-sm font-medium leading-relaxed"
          >
            Connect, apply to roles, manage casting calls, and present your premium portfolio to leading directors across the region.
          </motion.p>
        </div>
        
        <div className="relative z-10 text-xs text-gray-600 text-left">
          © 2026 NC Network. All rights reserved.
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Form Container */}
      <div className="w-full md:w-1/2 flex flex-col justify-start items-center p-6 sm:p-12 md:p-16 z-10 overflow-y-auto relative pt-4 md:pt-4">
        
        {/* Back Button */}
        <button 
          onClick={handleBack} 
          className="absolute top-6 left-6 flex items-center gap-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3.5 py-1.5 transition-all text-xs font-bold group cursor-pointer z-20"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>

        <div className="w-full max-w-[400px] flex flex-col items-center">
          
          {/* NC Logo (top center, horizontal) */}
          <Link 
            to="/" 
            className="flex flex-row items-center justify-center gap-2.5 mb-8 mt-[40px] sm:mt-[48px] md:mt-[40px] group cursor-pointer text-center"
          >
            {/* Yellow circle with NC */}
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-[20px] text-black shadow-lg shadow-[#FFD700]/10 transition-transform group-hover:scale-105"
              style={{ backgroundColor: '#FFD700' }}
            >
              NC
            </div>
            
            {/* Network text side-by-side */}
            <span className="text-white font-bold text-[18px] tracking-[0.5px]">
              Network
            </span>
          </Link>
          
          <div className="w-full">
            <AnimatePresence mode="wait">
              {/* VIEW 1: SIGN IN FORM */}
              {view === 'signin' && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8 text-left w-full"
                >
                  <div className="text-center w-full">
                    <h1 className="text-3xl font-black text-white tracking-tight text-center">Welcome Back</h1>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium text-center">Sign in to your NC Network account</p>
                  </div>

                {/* Error Banner */}
                {lockoutTimeLeft > 0 ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center space-y-2 relative overflow-hidden animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-xs">
                      <AlertCircle className="w-4.5 h-4.5 text-red-500" />
                      LOGIN RATE LIMITED
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Too many failed attempts. For your security, login is locked.
                    </p>
                    <div className="text-2xl font-black text-red-500 tracking-wider">
                      {Math.floor(lockoutTimeLeft / 60)}:{(lockoutTimeLeft % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ) : (
                  error && (
                    <div className="text-red-500 text-xs text-center bg-red-500/10 py-2.5 rounded-xl border border-red-500/20 font-bold">
                      {error}
                    </div>
                  )
                )}

                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => handleEmailChange(e.target.value)}
                        placeholder="you@example.com"
                        disabled={lockoutTimeLeft > 0}
                        className={getInputStyles('email')}
                      />
                      {validation.email.valid === true && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500">
                          <Check className="w-4.5 h-4.5" />
                        </span>
                      )}
                      {validation.email.valid === false && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-500">
                          <AlertCircle className="w-4.5 h-4.5" />
                        </span>
                      )}
                    </div>
                    {validation.email.valid === false && (
                      <p className="text-[10px] text-red-400 font-bold mt-1.5">{validation.email.msg}</p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold">Password</label>
                      <button 
                        type="button"
                        onClick={() => setView('forgot')}
                        disabled={isLoading}
                        className="text-[#00BFFF] text-xs font-bold hover:underline underline-offset-4"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={e => handlePasswordChange(e.target.value)}
                        placeholder="••••••••"
                        disabled={lockoutTimeLeft > 0}
                        className={getInputStyles('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={lockoutTimeLeft > 0}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                    {validation.password.valid === false && (
                      <p className="text-[10px] text-red-400 font-bold mt-1.5">{validation.password.msg}</p>
                    )}
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading || lockoutTimeLeft > 0}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00bfff] to-[#0080ff] hover:opacity-95 text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#00bfff]/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Sign In'}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">or continue with</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Google Sign-in Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || lockoutTimeLeft > 0}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-extrabold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 488 512" fill="currentColor">
                    <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                  </svg>
                  Sign in with Google
                </button>

                {/* Footer link */}
                <p className="text-center text-gray-500 text-sm mt-6">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => onNavigate('signup')} 
                    className="text-[#00BFFF] hover:underline underline-offset-4 font-bold"
                  >
                    Sign up
                  </button>
                </p>
              </motion.div>
            )}

            {/* VIEW 2: FORGOT PASSWORD */}
            {view === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 text-left"
              >
                <button
                  onClick={() => {
                    setView('signin');
                    setError('');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>

                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">Forgot Password</h1>
                  <p className="text-sm text-gray-500 mt-1.5 font-medium">Enter your email to receive a password reset link</p>
                </div>

                {error && (
                  <div className="text-red-500 text-xs text-center bg-red-500/10 py-2.5 rounded-xl border border-red-500/20 font-bold">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSendResetLink} className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => handleEmailChange(e.target.value)}
                        placeholder="you@example.com"
                        className={getInputStyles('email')}
                      />
                      {validation.email.valid === true && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500">
                          <Check className="w-4.5 h-4.5" />
                        </span>
                      )}
                      {validation.email.valid === false && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-500">
                          <AlertCircle className="w-4.5 h-4.5" />
                        </span>
                      )}
                    </div>
                    {validation.email.valid === false && (
                      <p className="text-[10px] text-red-400 font-bold mt-1.5">{validation.email.msg}</p>
                    )}
                  </div>

                  {/* Send Reset Link Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00bfff] to-[#0080ff] hover:opacity-95 text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* VIEW 3: FORGOT SUCCESS */}
            {view === 'forgot_success' && (
              <motion.div
                key="forgot_success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 text-center"
              >
                <div className="flex flex-col items-center justify-center space-y-4">
                  {/* Circular glowing green checkmark */}
                  <div className="w-20 h-20 bg-green-500/10 border border-green-500/25 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                  
                  <div className="space-y-2">
                    <h1 className="text-3xl font-black text-white tracking-tight">Check your email</h1>
                    <p className="text-sm text-gray-500 font-medium max-w-[320px] mx-auto leading-relaxed">
                      A password reset link has been successfully dispatched to <span className="text-white font-bold">{form.email}</span>. Please verify your inbox and spam folders.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setView('signin');
                    setError('');
                    setForm(prev => ({ ...prev, password: '' }));
                    setValidation({ email: { valid: null, msg: '' }, password: { valid: null, msg: '' } });
                  }}
                  className="inline-flex items-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-white/10 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                >
                  Back to Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
  );
}
