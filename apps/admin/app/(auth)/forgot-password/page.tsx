'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/backend/auth/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 429) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Something went wrong');
      }
      // The backend always returns 200 with a generic success message to
      // prevent email enumeration. Show the same UI regardless of the answer.
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-wide">OR</span>
          </div>
          <span className="font-semibold text-sm text-gray-900">Origin Admin</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-6">Forgot your password?</h1>
        <p className="text-sm text-gray-500 mt-2">
          Enter the email associated with your admin account. We&apos;ll send a reset link
          if the account exists.
        </p>

        {done ? (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Mail size={20} className="text-green-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Check your inbox</p>
                <p className="text-sm text-green-700 mt-1">
                  If <strong>{email}</strong> is registered, you&apos;ll get a reset link
                  in a minute. The link expires in 30 minutes.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-block mt-5 text-sm font-medium text-brand hover:text-brand-dark"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email}
              className="w-full px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Send reset link
            </button>

            <p className="text-center pt-2">
              <Link href="/login" className="text-sm text-gray-500 hover:text-brand">
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
