'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const { user, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevOtpHint(null);

    if (!email) {
      setError('Please enter your college email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.requestOTP(email);
      setSuccessMessage(res.message || 'Verification code sent to your email.');
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      setStep('OTP');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to request OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!otp) {
      setError('Please enter the 6-digit OTP verification code.');
      return;
    }

    try {
      setLoading(true);
      await api.verifyOTP(email, otp);
      setSuccessMessage('Successfully authenticated!');
      await refreshUser();
      router.replace('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to verify OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 backdrop-blur-md">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-lg shadow-blue-500/20 mb-2">
            CF
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Campus<span className="text-blue-500">Find</span>
          </h1>
          <p className="text-sm text-slate-400">
            College Passwordless Student Authentication
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl p-3.5 flex items-start gap-2">
            <span className="font-bold text-rose-400">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl p-3.5 flex items-start gap-2">
            <span className="font-bold text-emerald-400">Success:</span>
            <span>{successMessage}</span>
          </div>
        )}

        {devOtpHint && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl p-4 font-mono space-y-1">
            <div className="font-bold text-amber-400 text-[11px] uppercase tracking-wider">[DEV MODE] Generated OTP Code</div>
            <div className="text-2xl font-bold tracking-widest text-amber-200">{devOtpHint}</div>
          </div>
        )}

        {/* Step 1: Request OTP Form */}
        {step === 'EMAIL' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="collegeEmail" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                College Email Address
              </label>
              <input
                id="collegeEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@gecgudlavallerumic.in"
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Must be an authorized campus domain email.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Sending OTP Code...' : 'Send OTP Code'}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP Form */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="otpCode" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => { setStep('EMAIL'); setError(null); }}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Change Email
                </button>
              </div>
              <input
                id="otpCode"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-widest font-mono transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Enter code sent to <span className="font-semibold text-slate-300">{email}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Verifying...' : 'Verify OTP & Enter CampusFind'}
            </button>
          </form>
        )}

        <div className="text-center text-[11px] text-slate-600 pt-3 border-t border-slate-850">
          Secure HTTP-only cookie session authentication.
        </div>
      </div>
    </main>
  );
}
