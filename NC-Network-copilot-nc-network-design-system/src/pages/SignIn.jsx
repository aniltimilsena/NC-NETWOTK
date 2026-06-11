import { useState, useEffect } from 'react';
import { EyeToggleIcon } from "@/components/ui/animated-state-icons"
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { signInUser, ensureUserProfile, logoutUser, sendPasswordReset } from '../services/auth';

export default function SignIn({ onNavigate, showAlert }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Handle redirect result for mobile
  useEffect(() => {
    let isMounted = true;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          await ensureUserProfile(result.user);
          localStorage.removeItem('login_attempts');
          localStorage.removeItem('login_lockout_until');
          onNavigate('home');
        }
      } catch (err) {
        console.error("Redirect auth error:", err);
        if (isMounted) {
          setError('Google Sign-In failed. Please try again.');
          setIsLoading(false);
        }
      }
    };
    checkRedirect();
    return () => { isMounted = false; };
  }, [onNavigate]);

  // Handle countdown timer for lockout
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


  // 2FA States
  const [show2fa, setShow2fa] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [correctCode, setCorrectCode] = useState('');
  const [tempCredentials, setTempCredentials] = useState(null);
  const [twoFactorError, setTwoFactorError] = useState('');

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

    if (!form.email || !form.password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const { user, error: authError } = await signInUser(form.email, form.password);
    
    if (authError) {
      setIsLoading(false);
      
      // Increment failed attempts count in localStorage
      const currentAttempts = parseInt(localStorage.getItem('login_attempts') || '0', 10) + 1;
      localStorage.setItem('login_attempts', currentAttempts.toString());

      if (currentAttempts >= 5) {
        let duration = 60; // 1 minute
        if (currentAttempts === 6) {
          duration = 180; // 3 minutes
        } else if (currentAttempts >= 7) {
          duration = 600; // 10 minutes
        }
        
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
      // Clear login attempts on success
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('login_lockout_until');

      try {
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        if (profileSnap.exists() && profileSnap.data().twoFactorEnabled === true) {
          // Two-Factor is enabled!
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          setCorrectCode(code);
          setTempCredentials({ email: form.email, password: form.password });
          
          // Request and trigger browser notification
          if (Notification.permission === 'granted') {
            new Notification("NC-Network Verification", {
              body: `Your Two-Factor Authentication (2FA) verification code is: ${code}`,
              icon: '/logo.png',
              requireInteraction: true
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification("NC-Network Verification", {
                  body: `Your Two-Factor Authentication (2FA) verification code is: ${code}`,
                  icon: '/logo.png',
                  requireInteraction: true
                });
              }
            });
          }

          // Sign out immediately so they aren't authenticated yet
          await logoutUser();
          
          setShow2fa(true);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking 2FA profile:", err);
      }
      
      onNavigate('home');
    }
  };

  const handleVerify2fa = async (e) => {
    e?.preventDefault();
    if (!verificationCode) {
      setTwoFactorError('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    setTwoFactorError('');

    if (verificationCode.trim() === correctCode) {
      const { user, error: authError } = await signInUser(tempCredentials.email, tempCredentials.password);
      if (authError) {
        setTwoFactorError(authError);
        setIsLoading(false);
      } else {
        localStorage.removeItem('login_attempts');
        localStorage.removeItem('login_lockout_until');
        onNavigate('home');
      }
    } else {
      setTwoFactorError('Incorrect verification code. Please check your notifications.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(result.user);
        localStorage.removeItem('login_attempts');
        localStorage.removeItem('login_lockout_until');
        onNavigate('home');
      }
    } catch (err) {
      console.error(err);
      setError('Google Sign-In failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!form.email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { error: resetError } = await sendPasswordReset(form.email);
      if (resetError) {
        setError(resetError);
      } else {
        showAlert('Password Reset Sent', 'success', `A password reset link has been sent to ${form.email}.`);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (show2fa) {
    return (
      <div className="min-h-screen bg-nc-dark flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nc-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-nc-blue/5 rounded-full blur-3xl" />
        
        <div className="w-full max-w-md z-10">
          <div className="text-center mb-10">
            <Logo onNavigate={onNavigate} size="lg" className="mx-auto mb-6" />
            <h1 className="text-2xl font-black text-white">Two-Factor Verification</h1>
            <p className="text-nc-muted mt-1">Check your system notifications for the security code</p>
          </div>
          
          <GlassCard strong className="p-5 sm:p-8">
            <form onSubmit={handleVerify2fa} className="space-y-6">
              {twoFactorError && <div className="text-red-500 text-xs text-center bg-red-500/10 py-2 rounded-lg">{twoFactorError}</div>}
              
              <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-center">
                <p className="text-xs text-sky-400 font-semibold leading-relaxed">
                  A verification code has been dispatched. If you did not receive a system notification, please check your notification permissions.
                </p>
                {Notification.permission !== 'granted' && (
                  <div className="mt-2 text-[11px] text-[#888] border-t border-sky-500/10 pt-2">
                    Fallback code for testing (Notifications blocked): <span className="font-mono text-white font-bold select-all bg-white/10 px-1.5 py-0.5 rounded">{correctCode}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-nc-secondary mb-2">Verification Code</label>
                <input
                  type="text"
                  pattern="\d{6}"
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-center font-mono text-xl tracking-[0.3em] font-bold"
                />
              </div>
              
              <div className="space-y-3">
                <Button 
                  className="w-full justify-center" 
                  size="lg"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShow2fa(false);
                    setVerificationCode('');
                    setTwoFactorError('');
                    setTempCredentials(null);
                  }}
                  className="w-full text-center text-xs text-nc-muted hover:text-white transition-colors py-2"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nc-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nc-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-nc-blue/5 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <Logo onNavigate={onNavigate} size="lg" className="mx-auto mb-6" />
          <h1 className="text-2xl font-black text-white">Welcome back</h1>
          <p className="text-nc-muted mt-1">Sign in to your account</p>
        </div>
        
        <GlassCard strong className="p-5 sm:p-8">
          <div className="space-y-4">
            {lockoutTimeLeft > 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center space-y-3 relative overflow-hidden animate-pulse">
                <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Login Rate Limited
                </div>
                <p className="text-xs text-nc-secondary leading-relaxed">
                  Too many failed attempts. For your security, login has been locked.
                </p>
                <div className="text-2xl font-black text-red-500 tracking-wider">
                  {Math.floor(lockoutTimeLeft / 60)}:{(lockoutTimeLeft % 60).toString().padStart(2, '0')}
                </div>
                {/* Countdown Progress Bar */}
                <div className="w-full h-1 bg-nc-border rounded-full overflow-hidden absolute bottom-0 left-0">
                  <div 
                    className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                    style={{ 
                      width: `${(lockoutTimeLeft / (
                        parseInt(localStorage.getItem('login_attempts') || '5', 10) === 5 ? 60 : 
                        parseInt(localStorage.getItem('login_attempts') || '5', 10) === 6 ? 180 : 600
                      )) * 100}%` 
                    }}
                  />
                </div>
              </div>
            ) : (
              error && <div className="text-red-500 text-xs text-center bg-red-500/10 py-2 rounded-lg">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-2">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="you@example.com"
                className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-nc-secondary">Password</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="text-nc-accent text-xs hover:text-sky-300 disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="••••••••"
                  disabled={lockoutTimeLeft > 0}
                  className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={lockoutTimeLeft > 0}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nc-muted hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <EyeToggleIcon active={showPassword} size={20} color="currentColor" />
                </button>
              </div>
            </div>
            <Button 
              className="w-full justify-center" 
              size="lg"
              onClick={handleSignIn}
              disabled={isLoading || lockoutTimeLeft > 0}
            >
              {isLoading ? 'Signing in...' : lockoutTimeLeft > 0 ? 'Locked Out' : 'Sign In'}
            </Button>
            
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-nc-border" />
              <span className="text-nc-muted text-xs">or continue with</span>
              <div className="flex-1 h-px bg-nc-border" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleGoogleSignIn}
                disabled={isLoading || lockoutTimeLeft > 0}
                className="flex-1 flex items-center justify-center gap-2 bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-nc-secondary text-sm hover:border-nc-accent/30 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 488 512" fill="currentColor"><path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>
                Google
              </button>
              <button 
                onClick={() => showAlert('Sign in with Apple is coming soon!', 'info')}
                disabled={isLoading || lockoutTimeLeft > 0}
                className="flex-1 flex items-center justify-center gap-2 bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-nc-secondary text-sm hover:border-nc-accent/30 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                Apple
              </button>
            </div>
          </div>
        </GlassCard>
        
        <p className="text-center text-nc-muted text-sm mt-6">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('signup')} className="text-nc-accent hover:text-sky-300 font-medium">
            Sign up free
          </button>
        </p>
      </div>
    </div>
  );
}
