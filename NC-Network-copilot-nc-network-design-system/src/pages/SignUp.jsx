import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, Eye, EyeOff, Check, AlertCircle, ArrowLeft, Loader2, Sparkles, UserCheck, ShieldAlert, Heart
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import SEO from '../components/SEO';

import { signUpUser, ensureUserProfile } from '../services/auth';

export default function SignUp({ onNavigate, showAlert }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: 'Actor', 
    gender: 'Male' 
  });
  
  
  const [roleGroup, setRoleGroup] = useState('talent'); 
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  
  const [validation, setValidation] = useState({
    name: { valid: null, msg: '' },
    email: { valid: null, msg: '' },
    password: { valid: null, msg: '' },
    confirmPassword: { valid: null, msg: '' }
  });

  
  const handleNameChange = (val) => {
    setForm(prev => ({ ...prev, name: val }));
    if (!val) {
      setValidation(prev => ({ ...prev, name: { valid: false, msg: 'Full Name is required.' } }));
      return;
    }
    if (val.trim().length < 3) {
      setValidation(prev => ({ ...prev, name: { valid: false, msg: 'Name must be at least 3 characters.' } }));
    } else {
      setValidation(prev => ({ ...prev, name: { valid: true, msg: '' } }));
    }
  };

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

    
    if (form.confirmPassword) {
      if (val !== form.confirmPassword) {
        setValidation(prev => ({ ...prev, confirmPassword: { valid: false, msg: 'Passwords do not match.' } }));
      } else {
        setValidation(prev => ({ ...prev, confirmPassword: { valid: true, msg: '' } }));
      }
    }
  };

  const handleConfirmPasswordChange = (val) => {
    setForm(prev => ({ ...prev, confirmPassword: val }));
    if (!val) {
      setValidation(prev => ({ ...prev, confirmPassword: { valid: false, msg: 'Please repeat your password.' } }));
      return;
    }
    if (val !== form.password) {
      setValidation(prev => ({ ...prev, confirmPassword: { valid: false, msg: 'Passwords do not match.' } }));
    } else {
      setValidation(prev => ({ ...prev, confirmPassword: { valid: true, msg: '' } }));
    }
  };

  
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
          onNavigate('home');
        } else {
          sessionStorage.removeItem('nc_google_redirect');
        }
      } catch (err) {
        console.error("Redirect auth error:", err);
        sessionStorage.removeItem('nc_google_redirect');
        if (isMounted) {
          setError('Google Registration failed: ' + (err instanceof Error ? err.message : String(err)));
          setIsLoading(false);
        }
      }
    };
    checkRedirect();
    return () => { isMounted = false; };
  }, [onNavigate]);

  const validateAllLocally = () => {
    const n = form.name.trim().length >= 3;
    const e = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    const p = form.password.length >= 8;
    const cp = form.password === form.confirmPassword && form.confirmPassword.length > 0;
    
    setValidation({
      name: { valid: n, msg: n ? '' : 'Name must be at least 3 characters.' },
      email: { valid: e, msg: e ? '' : 'Please enter a valid email address.' },
      password: { valid: p, msg: p ? '' : 'Password must be at least 8 characters.' },
      confirmPassword: { valid: cp, msg: cp ? '' : 'Passwords do not match.' }
    });

    return n && e && p && cp;
  };

  const handleSignUp = async (e) => {
    e?.preventDefault();
    
    if (!validateAllLocally()) {
      setError('Please resolve validation errors before creating your account.');
      return;
    }

    if (!agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setIsLoading(true);
    setError('');

    
    let finalRole = form.role;
    if (roleGroup === 'casting') finalRole = 'Casting Director';
    else if (roleGroup === 'fan') finalRole = 'Fan';

    const { user, error: authError } = await signUpUser(
      form.email, 
      form.password, 
      form.name, 
      finalRole,
      form.gender
    );

    if (authError) {
      setError(authError);
      setIsLoading(false);
    } else {
      onNavigate('home');
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
        onNavigate('home');
      }
    } catch (err) {
      console.error(err);
      let friendlyMessage = err instanceof Error ? err.message : String(err);
      if (err && typeof err === 'object') {
        const code = err.code;
        if (code === 'auth/popup-closed-by-user') {
          friendlyMessage = 'Sign-up cancelled. The Google authentication window was closed.';
        } else if (code === 'auth/popup-blocked') {
          friendlyMessage = 'The Google authentication popup was blocked by your browser. Please allow popups for this site.';
        } else if (code === 'auth/cancelled-popup-request') {
          friendlyMessage = 'The authentication window was closed because another popup request was opened.';
        }
      }
      setError('Google Registration failed: ' + friendlyMessage);
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

  
  const getInputStyles = (field) => {
    const status = validation[field]?.valid;
    const common = "w-full bg-[#1a1a1a] text-white placeholder-gray-500 rounded-xl pl-10 pr-10 py-3 text-xs outline-none border transition-all duration-300 ";
    if (status === true) {
      return common + "border-green-500/50 focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]";
    }
    if (status === false) {
      return common + "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]";
    }
    return common + "border-white/5 focus:border-[#00BFFF]/50 focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)]";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row relative overflow-hidden font-sans">
      <SEO 
        title="Sign Up | NC Network" 
        description="Join NC Network to create your portfolio, find cinema calls, or recruit Nepali talent." 
      />

      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-[#00BFFF]/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* LEFT COLUMN: Cinematic Image (Desktop Only) */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-16 bg-cover bg-center" style={{ backgroundImage: "url('/cinematic_backstage.png')" }}>
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
            Discover Multiple Talents
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
            Create your profile, publish your videos, network with Nepalese directors, and let casting agencies find you directly for premium roles.
          </motion.p>
        </div>
        
        <div className="relative z-10 text-xs text-gray-600 text-left">
          © 2026 NC Network. All rights reserved.
        </div>
      </div>

      {/* RIGHT COLUMN: Signup Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-start items-center p-6 sm:p-12 md:p-16 z-10 overflow-y-auto max-h-screen relative pt-4 md:pt-4">
        
        {/* Back Button */}
        <button 
          onClick={handleBack} 
          className="absolute top-6 left-6 flex items-center gap-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3.5 py-1.5 transition-all text-xs font-bold group cursor-pointer z-20"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>

        <div className="w-full max-w-[420px] flex flex-col items-center">
          
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

          <div className="w-full space-y-6 text-left py-6">
            <div className="text-center w-full">
              <h1 className="text-3xl font-black text-white tracking-tight text-center">Join NC Network</h1>
              <p className="text-sm text-gray-500 mt-1.5 font-medium text-center">Create your talent profile today</p>
            </div>

          {error && (
            <div className="text-red-500 text-xs text-center bg-red-500/10 py-2.5 rounded-xl border border-red-500/20 font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Your full name"
                  className={getInputStyles('name')}
                />
                {validation.name.valid === true && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-green-500">
                    <Check className="w-4.5 h-4.5" />
                  </span>
                )}
                {validation.name.valid === false && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-500">
                    <AlertCircle className="w-4.5 h-4.5" />
                  </span>
                )}
              </div>
              {validation.name.valid === false && (
                <p className="text-[10px] text-red-400 font-bold mt-1">{validation.name.msg}</p>
              )}
            </div>

            {/* Email Address */}
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
                <p className="text-[10px] text-red-400 font-bold mt-1">{validation.email.msg}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  placeholder="Min 8 characters"
                  className={getInputStyles('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {validation.password.valid === false && (
                <p className="text-[10px] text-red-400 font-bold mt-1">{validation.password.msg}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={e => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Repeat your password"
                  className={getInputStyles('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {validation.confirmPassword.valid === false && (
                <p className="text-[10px] text-red-400 font-bold mt-1">{validation.confirmPassword.msg}</p>
              )}
            </div>

            {/* Gender Selection */}
            <div>
              <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">Gender</label>
              <div className="flex gap-2">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, gender: g }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      form.gender === g
                        ? 'bg-[#00BFFF]/10 border-[#00BFFF] text-[#00BFFF]'
                        : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Outer Role Selector: "I am a..." */}
            <div>
              <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-3">I am a...</label>
              
              <div className="grid grid-cols-3 gap-2.5">
                {/* Talent Card */}
                <button
                  key="talent"
                  type="button"
                  onClick={() => {
                    setRoleGroup('talent');
                    setForm(prev => ({ ...prev, role: 'Actor' })); 
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                    roleGroup === 'talent'
                      ? 'bg-[#00BFFF]/10 border-[#00BFFF] text-[#00BFFF]'
                      : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-5 h-5 mb-1.5" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Talent</span>
                </button>

                {/* Casting Director Card */}
                <button
                  key="casting"
                  type="button"
                  onClick={() => {
                    setRoleGroup('casting');
                    setForm(prev => ({ ...prev, role: 'Casting Director' }));
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                    roleGroup === 'casting'
                      ? 'bg-[#00BFFF]/10 border-[#00BFFF] text-[#00BFFF]'
                      : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5 mb-1.5" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Recruiter</span>
                </button>

                {/* Fan Card */}
                <button
                  key="fan"
                  type="button"
                  onClick={() => {
                    setRoleGroup('fan');
                    setForm(prev => ({ ...prev, role: 'Fan' }));
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                    roleGroup === 'fan'
                      ? 'bg-[#00BFFF]/10 border-[#00BFFF] text-[#00BFFF]'
                      : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <Heart className="w-5 h-5 mb-1.5" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Fan</span>
                </button>
              </div>

              {/* Sub-Selection for Talent */}
              <AnimatePresence>
                {roleGroup === 'talent' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3"
                  >
                    <div className="bg-[#111] border border-white/5 p-3 rounded-2xl space-y-2">
                      <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Select professional category:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['Actor', 'Model', 'Dancer', 'Director'].map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, role: sub }))}
                            className={`py-2 px-3 rounded-lg text-xs font-bold text-center border transition-all ${
                              form.role === sub
                                ? 'bg-white text-black border-white'
                                : 'bg-[#1a1a1a] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start gap-2.5 py-1.5">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={agreeToTerms}
                onChange={e => setAgreeToTerms(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-[#00BFFF] focus:ring-[#00BFFF] mt-0.5 cursor-pointer shrink-0"
              />
              <label htmlFor="terms-checkbox" className="text-xs text-gray-500 leading-normal select-none cursor-pointer">
                I agree to the <span className="text-gray-400 hover:text-white cursor-pointer underline underline-offset-2">Terms of Service</span> and <span className="text-gray-400 hover:text-white cursor-pointer underline underline-offset-2">Privacy Policy</span>
              </label>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading || !agreeToTerms}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#00bfff] to-[#0080ff] hover:opacity-95 text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#00bfff]/10 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Create Account'}
            </button>

          </form>

          {/* Divider */}
          <div className="relative flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">or continue with</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Google signup button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-extrabold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 488 512" fill="currentColor">
              <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
            </svg>
            Sign up with Google
          </button>

          {/* Bottom redirection */}
          <p className="text-center text-gray-500 text-sm pt-4">
            Already have an account?{' '}
            <button 
              onClick={() => onNavigate('signin')} 
              className="text-[#00BFFF] hover:underline underline-offset-4 font-bold"
            >
              Sign in
            </button>
          </p>

        </div>
      </div>
    </div>
  </div>
  );
}
