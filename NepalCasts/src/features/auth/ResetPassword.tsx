import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import SEO from '../../components/SEO';
import Logo from '../../components/ui/Logo';
import { auth } from '../../lib/firebase';
import { confirmPasswordReset } from 'firebase/auth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid or expired password reset link.');
    }
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!oobCode) {
      setError('Missing reset token.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative font-sans">
      <SEO title="Reset Password | NepalCasts" description="Set your new NepalCasts password." />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Create New Password</h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Choose a strong password for your NepalCasts account.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 backdrop-blur-xl">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Password Changed!</h2>
              <p className="text-xs text-gray-400">Your password has been updated successfully.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
              >
                Log In Now
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-[#00BFFF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-[#00BFFF] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !oobCode}
                className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
