import { useState, useEffect } from 'react';
import { EyeToggleIcon } from "@/components/ui/animated-state-icons"
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

import { signUpUser, ensureUserProfile } from '../services/auth';

export default function SignUp({ onNavigate, showAlert }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', gender: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle redirect result for mobile
  useEffect(() => {
    let isMounted = true;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          await ensureUserProfile(result.user);
          onNavigate('home');
        }
      } catch (err) {
        console.error("Redirect auth error:", err);
        if (isMounted) {
          setError('Google Registration failed. Please try again.');
          setIsLoading(false);
        }
      }
    };
    checkRedirect();
    return () => { isMounted = false; };
  }, [onNavigate]);

  const handleSignUp = async (e) => {
    e?.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role || !form.gender) {
      setError('Please fill in all fields including your role and gender.');
      return;
    }

    setIsLoading(true);
    setError('');

    const { user, error: authError } = await signUpUser(
      form.email, 
      form.password, 
      form.name, 
      form.role,
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
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(result.user);
        onNavigate('home');
      }
    } catch (err) {
      console.error(err);
      setError('Google Registration failed. Please try again.');
      setIsLoading(false);
    }
  };
  const roles = ['Actor', 'Director', 'Model', 'Cinematographer', 'Editor', 'Dancer', 'Writer', 'Agent'];

  return (
    <div className="min-h-screen bg-nc-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-nc-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-nc-blue/5 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <Logo onNavigate={onNavigate} size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white">Create your profile</h1>
          <p className="text-nc-muted mt-1">Join 25,000+ talent on NC Network</p>
        </div>
        
        <GlassCard strong className="p-5 sm:p-8">
          <div className="space-y-3 sm:space-y-4">
            {error && <div className="text-red-500 text-xs text-center bg-red-500/10 py-2 rounded-lg">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-2">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Your full name"
                className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm"
              />
            </div>
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
              <label className="block text-sm font-medium text-nc-secondary mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Min 8 characters"
                  className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nc-muted hover:text-white transition-colors"
                >
                  <EyeToggleIcon active={showPassword} size={20} color="currentColor" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-3">Gender</label>
              <div className="flex flex-wrap gap-2">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g}
                    onClick={() => setForm({...form, gender: g})}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      form.gender === g
                        ? 'bg-nc-accent/20 border-nc-accent text-nc-accent'
                        : 'bg-nc-surface border-nc-border text-nc-muted hover:border-nc-accent/30 hover:text-nc-secondary'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-3">I am a...</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <button
                    key={role}
                    onClick={() => setForm({...form, role})}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      form.role === role
                        ? 'bg-nc-accent/20 border-nc-accent text-nc-accent'
                        : 'bg-nc-surface border-nc-border text-nc-muted hover:border-nc-accent/30 hover:text-nc-secondary'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <Button 
              className="w-full justify-center" 
              size="lg"
              onClick={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <p className="text-nc-muted text-xs text-center">
              By signing up, you agree to our{' '}
              <span className="text-nc-accent cursor-pointer">Terms of Service</span> and{' '}
              <span className="text-nc-accent cursor-pointer">Privacy Policy</span>
            </p>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-nc-border" />
              <span className="text-nc-muted text-xs">or continue with</span>
              <div className="flex-1 h-px bg-nc-border" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleGoogleSignIn}
                className="flex-1 flex items-center justify-center gap-2 bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-nc-secondary text-sm hover:border-nc-accent/30 hover:text-white transition-all"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 488 512" fill="currentColor"><path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/></svg>
                Google
              </button>
              <button 
                onClick={() => showAlert('Sign in with Apple is coming soon!', 'info')}
                className="flex-1 flex items-center justify-center gap-2 bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-nc-secondary text-sm hover:border-nc-accent/30 hover:text-white transition-all"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                Apple
              </button>
            </div>
          </div>
        </GlassCard>
        
        <p className="text-center text-nc-muted text-sm mt-6">
          Already have an account?{' '}
          <button onClick={() => onNavigate('signin')} className="text-nc-accent hover:text-sky-300 font-medium">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
