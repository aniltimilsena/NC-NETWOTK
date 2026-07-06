import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, Eye, EyeOff, Check, AlertCircle, ArrowLeft, Loader2, Sparkles, UserCheck, ShieldAlert, Heart
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import SEO from '../components/SEO';

import { signUpUser, ensureUserProfile } from '../services/auth';
import { getUserFriendlyError } from '../utils/errorHandler';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { evaluatePasswordStrength } from '../utils/security';
import { Progress } from '../components/ui/progress';
import Logo from '../components/ui/Logo';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';

const step1Schema = (t: any) => z.object({
  name: z.string().min(3, { message: t('err_name_length', 'Name must be at least 3 characters.') }),
  email: z.string().email({ message: t('err_email_invalid', 'Please enter a valid email address.') }),
});

const step2Schema = (t: any) => z.object({
  password: z
    .string()
    .min(8, { message: t('err_password_length', 'Password must be at least 8 characters.') })
    .regex(/[A-Z]/, { message: t('err_password_uppercase', 'Password must contain at least one uppercase letter.') })
    .regex(/[0-9]/, { message: t('err_password_number', 'Password must contain at least one number.') }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: t('err_passwords_mismatch', 'Passwords do not match.'),
  path: ['confirmPassword']
});

interface SignUpProps {
  onNavigate: (page: string, param?: any) => void;
  showAlert?: (config: { type: 'success' | 'error'; message: string }) => void;
}

interface ValidationField {
  valid: boolean | null;
  msg: string;
}

interface ValidationState {
  name: ValidationField;
  email: ValidationField;
  password: ValidationField;
  confirmPassword: ValidationField;
}

export default function SignUp({ onNavigate, showAlert }: SignUpProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: 'Actor', 
    gender: 'Male' 
  });
  
  const [roleGroup, setRoleGroup] = useState<string>('talent'); 
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [validation, setValidation] = useState<ValidationState>({
    name: { valid: null, msg: '' },
    email: { valid: null, msg: '' },
    password: { valid: null, msg: '' },
    confirmPassword: { valid: null, msg: '' }
  });

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    (window as any).onTurnstileSuccess = (token: string) => {
      setTurnstileToken(token);
      setError('');
    };

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      delete (window as any).onTurnstileSuccess;
      const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleNameChange = (val: string) => {
    setForm(prev => ({ ...prev, name: val }));
    const result = step1Schema(t).shape.name.safeParse(val);
    if (!result.success) {
      setValidation(prev => ({ ...prev, name: { valid: false, msg: result.error.issues[0].message } }));
    } else {
      setValidation(prev => ({ ...prev, name: { valid: true, msg: '' } }));
    }
  };

  const handleEmailChange = (val: string) => {
    setForm(prev => ({ ...prev, email: val }));
    const result = step1Schema(t).shape.email.safeParse(val);
    if (!result.success) {
      setValidation(prev => ({ ...prev, email: { valid: false, msg: result.error.issues[0].message } }));
    } else {
      setValidation(prev => ({ ...prev, email: { valid: true, msg: '' } }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setForm(prev => ({ ...prev, password: val }));
    const result = step2Schema(t).shape.password.safeParse(val);
    if (!result.success) {
      setValidation(prev => ({ ...prev, password: { valid: false, msg: result.error.issues[0].message } }));
    } else {
      setValidation(prev => ({ ...prev, password: { valid: true, msg: '' } }));
    }

    if (form.confirmPassword) {
      if (val !== form.confirmPassword) {
        setValidation(prev => ({ ...prev, confirmPassword: { valid: false, msg: t('err_passwords_mismatch', 'Passwords do not match.') } }));
      } else {
        setValidation(prev => ({ ...prev, confirmPassword: { valid: true, msg: '' } }));
      }
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setForm(prev => ({ ...prev, confirmPassword: val }));
    if (val !== form.password) {
      setValidation(prev => ({ ...prev, confirmPassword: { valid: false, msg: t('err_passwords_mismatch', 'Passwords do not match.') } }));
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
          setError(t('err_google_failed', 'Google Registration failed') + ': ' + getUserFriendlyError(err));
          setIsLoading(false);
        }
      }
    };
    checkRedirect();
    return () => { isMounted = false; };
  }, [onNavigate, t]);

  const validateStep = (currentStep: number) => {
    setError('');
    if (currentStep === 1) {
      const result = step1Schema(t).safeParse({ name: form.name, email: form.email });
      if (result.success) {
        setValidation(prev => ({
          ...prev,
          name: { valid: true, msg: '' },
          email: { valid: true, msg: '' }
        }));
        return true;
      } else {
        const errors: Record<string, string> = {};
        result.error.issues.forEach(issue => {
          errors[issue.path[0] as string] = issue.message;
        });
        setValidation(prev => ({
          ...prev,
          name: { valid: !errors.name, msg: errors.name || '' },
          email: { valid: !errors.email, msg: errors.email || '' }
        }));
        return false;
      }
    } else if (currentStep === 2) {
      const result = step2Schema(t).safeParse({ password: form.password, confirmPassword: form.confirmPassword });
      if (result.success) {
        setValidation(prev => ({
          ...prev,
          password: { valid: true, msg: '' },
          confirmPassword: { valid: true, msg: '' }
        }));
        if (!turnstileToken) {
          setError(t('err_turnstile_required', 'Please complete the security challenge.'));
          return false;
        }
        return true;
      } else {
        const errors: Record<string, string> = {};
        result.error.issues.forEach(issue => {
          errors[issue.path[0] as string] = issue.message;
        });
        setValidation(prev => ({
          ...prev,
          password: { valid: !errors.password, msg: errors.password || '' },
          confirmPassword: { valid: !errors.confirmPassword, msg: errors.confirmPassword || '' }
        }));
        return false;
      }
    }
    return true;
  };

  const validateAllLocally = () => {
    return validateStep(1) && validateStep(2);
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateAllLocally()) {
      setError(t('err_validation_title', 'Please resolve validation errors before creating your account.'));
      return;
    }

    if (!agreeToTerms) {
      setError(t('err_terms_required', 'You must agree to the Terms of Service and Privacy Policy.'));
      return;
    }

    if (!turnstileToken) {
      setError(t('err_turnstile_required', 'Please complete the security challenge.'));
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
      setError(getUserFriendlyError(authError));
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
      } catch (err: any) {
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
      setError(t('err_google_failed', 'Google Registration failed') + ': ' + getUserFriendlyError(err));
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

  const getInputStyles = (field: keyof ValidationState) => {
    const status = validation[field]?.valid;
    const common = "w-full bg-[#1a1a1a] text-white placeholder-gray-500 rounded-xl pl-10 pr-10 py-3 text-xs outline-none border transition-all duration-300 ";
    if (status === true) {
      return common + "border-green-500/50 focus:border-green-500 focus:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]";
    }
    if (status === false) {
      return common + "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]";
    }
    return common + "border-white/5 focus:border-yellow-500/50 focus:shadow-[0_0_0_3px_rgba(250,204,21,0.15)]";
  };

  const passwordStrength = evaluatePasswordStrength(form.password);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row relative overflow-hidden font-sans">
      <SEO 
        title="Sign Up | NC Network" 
        description="Join NC Network to create your portfolio, find cinema calls, or recruit Nepali talent." 
        schema={undefined}
      />

      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
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
          <span>{t('lbl_back')}</span>
        </button>

        <GlassCard strong className="p-8 border border-white/5 bg-[#111]/90 w-full max-w-[450px] flex flex-col items-center shadow-2xl relative" onClick={undefined}>
          
          {/* Logo component */}
          <Logo size="lg" className="mb-8 mt-[20px] sm:mt-[30px]" />

          <div className="w-full space-y-6 text-left py-2">
            <div className="text-center w-full">
              <h1 className="text-3xl font-black text-white tracking-tight text-center">{t('join_nc_network', 'Join NC Network')}</h1>
              <p className="text-sm text-gray-500 mt-1.5 font-medium text-center">{t('create_profile_desc', 'Create your talent profile today')}</p>
            </div>

            {/* Step Progress Indicator (Progress component wrapper) */}
            <div className="space-y-2 mb-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-400">
                <span>{t('step_indicator', { current: step, total: 3 })}</span>
                <span className="text-yellow-400">{step === 1 ? 'Account Details' : step === 2 ? 'Security & Credentials' : 'Roles & Agreement'}</span>
              </div>
              <Progress value={(step / 3) * 100} className="h-1.5 bg-white/5 rounded-full" />
            </div>

            {error && (
              <div className="text-red-500 text-xs text-center bg-red-500/10 py-2.5 rounded-xl border border-red-500/20 font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              
              {/* STEP 1: Account details */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">{t('lbl_name')}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => handleNameChange(e.target.value)}
                        placeholder={t('placeholder_name')}
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
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">{t('lbl_email')}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => handleEmailChange(e.target.value)}
                        placeholder={t('placeholder_email')}
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
                </div>
              )}

              {/* STEP 2: Password and credentials */}
              {step === 2 && (
                <div className="space-y-4">
                  {/* Password */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">{t('lbl_password')}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={e => handlePasswordChange(e.target.value)}
                        placeholder={t('placeholder_password')}
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

                    {/* Password Strength Meter */}
                    {form.password && (
                      <div className="mt-2.5 space-y-2 bg-[#111] p-3 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          <span>Password Strength:</span>
                          <span className={
                            passwordStrength.strength === 'Strong' ? 'text-green-400' :
                            passwordStrength.strength === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                          }>
                            {passwordStrength.strength}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${
                            passwordStrength.strength === 'Strong' ? 'w-full bg-green-500' :
                            passwordStrength.strength === 'Medium' ? 'w-2/3 bg-yellow-500' : 'w-1/3 bg-red-500'
                          }`} />
                        </div>
                        
                        {/* Dynamic Rule Indicators */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {[
                            { key: 'length', label: 'Min 8 characters' },
                            { key: 'uppercase', label: 'One uppercase letter' },
                            { key: 'number', label: 'One number' },
                            { key: 'special', label: 'One special char' }
                          ].map((rule) => {
                            const met = passwordStrength.rules[rule.key as keyof typeof passwordStrength.rules];
                            return (
                              <div key={rule.key} className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500">
                                <Check className={`w-3.5 h-3.5 shrink-0 ${met ? 'text-green-500' : 'opacity-25'}`} />
                                <span className={met ? 'text-gray-300' : ''}>{rule.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {validation.password.valid === false && (
                      <p className="text-[10px] text-red-400 font-bold mt-1">{validation.password.msg}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">{t('lbl_confirm_password')}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={e => handleConfirmPasswordChange(e.target.value)}
                        placeholder={t('placeholder_confirm_password')}
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

                  {/* Cloudflare Turnstile Challenge */}
                  <div 
                    className="cf-turnstile my-4 flex justify-center" 
                    data-sitekey="1x00000000000000000000AA"
                    data-theme="dark"
                    data-callback="onTurnstileSuccess"
                  />
                </div>
              )}

              {/* STEP 3: Roles and gender selection */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Gender Selection */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-2">{t('lbl_gender')}</label>
                    <div className="flex gap-2">
                      {['Male', 'Female', 'Other'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, gender: g }))}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            form.gender === g
                              ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
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
                    <label className="block text-[10px] uppercase tracking-[1px] text-[#888] font-bold mb-3">{t('lbl_role')}</label>
                    
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
                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                            : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <UserCheck className="w-5 h-5 mb-1.5" />
                        <span className="text-[11px] font-black uppercase tracking-wider">{t('lbl_talent')}</span>
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
                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                            : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <ShieldAlert className="w-5 h-5 mb-1.5" />
                        <span className="text-[11px] font-black uppercase tracking-wider">{t('lbl_recruiter')}</span>
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
                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                            : 'bg-[#111] border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <Heart className="w-5 h-5 mb-1.5" />
                        <span className="text-[11px] font-black uppercase tracking-wider">{t('lbl_fan')}</span>
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
                      className="w-4 h-4 rounded border-white/10 bg-[#1a1a1a] text-yellow-500 focus:ring-yellow-500 mt-0.5 cursor-pointer shrink-0"
                    />
                    <label htmlFor="terms-checkbox" className="text-xs text-gray-500 leading-normal select-none cursor-pointer">
                      {t('lbl_agree_terms')}
                    </label>
                  </div>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div className="flex gap-3 pt-4 w-full">
                {step > 1 && (
                  <Button
                    variant="secondary"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest"
                  >
                    {t('step_prev')}
                  </Button>
                )}
                
                {step < 3 ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (validateStep(step)) {
                        setStep(step + 1);
                      }
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_4px_20px_rgba(250,204,21,0.25)] text-black py-3.5 text-xs font-black uppercase tracking-widest border-none"
                  >
                    {t('step_next')}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading || !agreeToTerms}
                    onClick={undefined}
                    className="flex-1 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_4px_20px_rgba(250,204,21,0.25)] text-black py-3.5 text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed border-none"
                  >
                    {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin mx-auto text-black" /> : t('lbl_create_account')}
                  </Button>
                )}
              </div>

            </form>

            {/* Divider */}
            <div className="relative flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">{t('lbl_or_continue_with', 'or continue with')}</span>
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
              {t('lbl_signup_google', 'Sign up with Google')}
            </button>

            {/* Bottom redirection */}
            <p className="text-center text-gray-500 text-sm pt-4">
              {t('lbl_already_have_account', 'Already have an account?')}{' '}
              <button 
                onClick={() => onNavigate('signin')} 
                className="text-yellow-500 hover:underline underline-offset-4 font-bold"
              >
                {t('lbl_signin', 'Sign in')}
              </button>
            </p>

          </div>
        </GlassCard>
      </div>
    </div>
  );
}
