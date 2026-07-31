import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import SEO from '../../components/SEO';
import Logo from '../../components/ui/Logo';
import { sendPasswordReset } from './services/auth';

interface ForgotPasswordProps {
  onNavigate?: (page: string) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset link. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onNavigate) onNavigate('signin');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative font-sans">
      <SEO
        title="Forgot Password | NepalCasts Account Recovery"
        description="Reset your NepalCasts account password safely."
      />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Reset Password</h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 backdrop-blur-xl">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h2 className="text-lg font-bold text-white">Check Your Inbox</h2>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
                We sent a password reset link to <span className="text-white font-semibold">{email}</span>.
              </p>
              <button
                onClick={handleBack}
                className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
              >
                Return to Login
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
                <label className="text-xs font-bold text-gray-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-600 focus:border-[#00BFFF] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Link</span>}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
