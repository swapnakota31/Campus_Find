'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type LoginRole = 'STUDENT' | 'ADMIN';

type LoginCardState = {
  email: string;
  otp: string;
  step: 'EMAIL' | 'OTP';
  loading: boolean;
  error: string | null;
  success: string | null;
};

function LoginCard({
  role,
  title,
  helperText,
  emailPlaceholder,
  redirectAfterLogin,
}: {
  role: LoginRole;
  title: string;
  helperText: string;
  emailPlaceholder: string;
  redirectAfterLogin: (userRole: 'STUDENT' | 'ADMIN') => void;
}) {
  const [state, setState] = useState<LoginCardState>({
    email: '',
    otp: '',
    step: 'EMAIL',
    loading: false,
    error: null,
    success: null,
  });

  const { refreshUser } = useAuth();

  const setField = <K extends keyof LoginCardState>(field: K, value: LoginCardState[K]) => {
    setState((current) => ({ ...current, [field]: value }));
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setField('error', null);
    setField('success', null);

    if (!state.email) {
      setField('error', 'Please enter your college email address.');
      return;
    }

    try {
      setField('loading', true);
      const res = await api.requestOTP(state.email);
      setField('success', res.message || 'Verification code sent to your email.');
      setField('step', 'OTP');
    } catch (err: any) {
      console.error(err);
      setField('error', err.message || 'Failed to request OTP code.');
    } finally {
      setField('loading', false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setField('error', null);
    setField('success', null);

    if (!state.otp) {
      setField('error', 'Please enter the 6-digit OTP verification code.');
      return;
    }

    try {
      setField('loading', true);
      await api.verifyOTP(state.email, state.otp);
      const nextUser = await refreshUser();
      setField('success', 'Successfully authenticated!');
      redirectAfterLogin(nextUser?.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
    } catch (err: any) {
      console.error(err);
      setField('error', err.message || 'Failed to verify OTP code.');
    } finally {
      setField('loading', false);
    }
  };

  return (
    <div className="campus-card p-5 sm:p-6">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--campus-light)] text-xl font-black text-[var(--campus-royal)]">
          {role === 'STUDENT' ? 'S' : 'A'}
        </div>
        <h2 className="text-2xl font-black text-[var(--campus-text)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--campus-muted)]">{helperText}</p>
      </div>

      {state.error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          {state.success}
        </div>
      )}

      {state.step === 'EMAIL' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label htmlFor={`${role.toLowerCase()}-email`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--campus-muted)]">
              College Email Address
            </label>
            <input
              id={`${role.toLowerCase()}-email`}
              type="email"
              value={state.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder={emailPlaceholder}
              required
              className="w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-4 py-3.5 text-sm text-[var(--campus-text)] placeholder:text-[var(--campus-muted)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]"
            />
          </div>

          <button type="submit" disabled={state.loading} className="campus-button-primary w-full px-4 py-3.5 text-sm disabled:opacity-50">
            {state.loading ? 'Sending OTP Code...' : 'Send OTP Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor={`${role.toLowerCase()}-otp`} className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--campus-muted)]">
                6-Digit Verification Code
              </label>
              <button type="button" onClick={() => { setField('step', 'EMAIL'); setField('error', null); }} className="text-[11px] font-semibold text-[var(--campus-royal)]">
                Change Email
              </button>
            </div>
            <input
              id={`${role.toLowerCase()}-otp`}
              type="text"
              maxLength={6}
              value={state.otp}
              onChange={(e) => setField('otp', e.target.value)}
              placeholder="123456"
              required
              className="w-full rounded-xl border border-[var(--campus-border)] bg-[var(--campus-bg)] px-4 py-3.5 text-center text-xl font-mono tracking-[0.4em] text-[var(--campus-text)] placeholder:text-[var(--campus-muted)] focus:border-[var(--campus-royal)] focus:outline-none focus:ring-2 focus:ring-[rgba(30,90,168,0.12)]"
            />
            <p className="mt-2 text-[11px] text-[var(--campus-muted)]">
              Enter code sent to <span className="font-semibold text-[var(--campus-text)]">{state.email}</span>
            </p>
          </div>

          <button type="submit" disabled={state.loading} className="campus-button-primary w-full px-4 py-3.5 text-sm disabled:opacity-50">
            {state.loading ? 'Verifying...' : 'Verify OTP & Continue'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  const { loading } = useAuth();
  const router = useRouter();

  const redirectAfterLogin = (userRole: 'STUDENT' | 'ADMIN') => {
    if (userRole === 'ADMIN') {
      router.replace('/admin/matches');
    } else {
      router.replace('/');
    }
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[var(--campus-bg)] p-6"><div className="campus-card w-full max-w-md p-6 text-center text-[var(--campus-muted)]">Loading CampusFind...</div></main>;
  }

  return (
    <main className="min-h-screen bg-[var(--campus-bg)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-[var(--campus-border)] bg-white shadow-[var(--campus-shadow)]">
          <img
            src="/images/college-campus.jpg"
            alt="College campus"
            className="h-52 w-full object-cover sm:h-64 lg:h-72"
          />
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--campus-navy)] text-2xl font-black text-[var(--campus-yellow)] shadow-lg shadow-[rgba(18,59,112,0.12)]">
            CF
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--campus-text)] sm:text-4xl">
            Campus<span className="text-[var(--campus-royal)]">Find</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--campus-muted)]">College Lost & Found Portal</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <LoginCard
            role="STUDENT"
            title="Student Login"
            helperText="Access your campus account to report and recover items."
            emailPlaceholder="student@college.edu"
            redirectAfterLogin={redirectAfterLogin}
          />
          <LoginCard
            role="ADMIN"
            title="Admin Login"
            helperText="Authorized campus staff can review matches and approve recovery workflows."
            emailPlaceholder="admin@college.edu"
            redirectAfterLogin={redirectAfterLogin}
          />
        </div>
      </div>
    </main>
  );
}
