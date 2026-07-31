import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import SEO from '../../components/SEO';
import Logo from '../../components/ui/Logo';
import { auth } from '../../lib/firebase';
import { sendEmailVerification, applyActionCode } from 'firebase/auth';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [verifying, setVerifying] = useState(!!oobCode);
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (oobCode) {
      setVerifying(true);
      applyActionCode(auth, oobCode)
        .then(() => {
          setVerified(true);
          setError('');
        })
        .catch((err: any) => {
          setError(err.message || 'Verification link is invalid or has expired.');
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [oobCode]);

  const handleResend = async () => {
    if (!currentUser) {
      setError('Please log in first to receive a new verification email.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendEmailVerification(currentUser);
      setResent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email. Try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 relative font-sans">
      <SEO title="Verify Email | NepalCasts Account Security" description="Verify your email address for NepalCasts." />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Email Verification</h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Confirm your email address to unlock full platform features.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 backdrop-blur-xl text-center">
          {verifying ? (
            <div className="py-8 space-y-3">
              <Loader2 className="w-10 h-10 text-[#00BFFF] animate-spin mx-auto" />
              <p className="text-xs text-gray-400">Verifying your email address...</p>
            </div>
          ) : verified || currentUser?.emailVerified ? (
            <div className="space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">Email Verified!</h2>
              <p className="text-xs text-gray-400">Your account is fully activated and ready to use.</p>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
              >
                Go to Home Feed
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="w-12 h-12 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                We sent a verification link to{' '}
                <span className="text-white font-semibold">{currentUser?.email || 'your email'}</span>. Please check your inbox and click the link.
              </p>

              {resent && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  A new verification link has been sent!
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleResend}
                  disabled={sending}
                  className="w-full py-3 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Resend Email</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 text-xs text-gray-400 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
