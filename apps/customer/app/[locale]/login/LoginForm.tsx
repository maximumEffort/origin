'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Phone, Shield, User, Building2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { sendOtp, verifyOtp } from '@/lib/auth';

type AccountType = 'individual' | 'business';
type Step = 'type' | 'phone' | 'otp';

export default function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login, customer } = useAuth();

  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [phone, setPhone] = useState('+971');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('type');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Already logged in — redirect to dashboard
  if (customer) {
    router.replace(`/${locale}/dashboard`);
    return null;
  }

  const uaePhoneRegex = /^\+971\s?5\d{1}\s?\d{3}\s?\d{4}$/;

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!uaePhoneRegex.test(cleaned) && !/^\+9715\d{8}$/.test(cleaned)) {
      setError(t('invalidPhone'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendOtp(cleaned);
      setSuccess(t('otpSent'));
      setStep('otp');
    } catch {
      setError(t('otpError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError(t('invalidOtp'));
      return;
    }
    setError('');
    setLoading(true);

    const cleaned = phone.replace(/\s/g, '');

    try {
      const result = await verifyOtp(cleaned, code);
      const cust = {
        id: result.customer.id,
        phone: result.customer.phone,
        name: result.customer.fullName,
        email: null,
        language: result.customer.preferredLanguage,
        kycStatus: result.customer.kycStatus,
      };
      // Tokens are set as httpOnly cookies by the proxy route; the customer is all we keep client-side.
      login(cust);

      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      // Validate redirect is a safe same-origin path (prevent open redirect)
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        router.push(redirect);
      } else if (accountType === 'business') {
        router.push(`/${locale}/corporate`);
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch {
      setError(t('verifyError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-20 min-h-screen">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* ── Step 1: Account Type ── */}
          {step === 'type' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-neutral-900">{t('accountType')}</h1>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { setAccountType('individual'); setStep('phone'); }}
                  className="w-full flex items-start gap-4 p-5 border-2 border-neutral-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center shrink-0">
                    <User className="text-brand" size={22} />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900">{t('individual')}</div>
                    <p className="text-sm text-neutral-500 mt-0.5">{t('individualDesc')}</p>
                  </div>
                </button>

                <button
                  onClick={() => { setAccountType('business'); setStep('phone'); }}
                  className="w-full flex items-start gap-4 p-5 border-2 border-neutral-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-all text-left"
                >
                  <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center shrink-0">
                    <Building2 className="text-brand" size={22} />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900">{t('business')}</div>
                    <p className="text-sm text-neutral-500 mt-0.5">{t('businessDesc')}</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Phone Number ── */}
          {step === 'phone' && (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="text-brand" size={24} />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900">{t('loginTitle')}</h1>
                <p className="text-neutral-500 text-sm mt-2">{t('loginSubtitle')}</p>
                {accountType && (
                  <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-brand/10 text-brand text-xs font-medium rounded-full">
                    {accountType === 'business' ? <Building2 size={12} /> : <User size={12} />}
                    {accountType === 'business' ? t('business') : t('individual')}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="login-phone" className="block text-sm font-medium text-neutral-700 mb-2">
                    {t('phone')}
                  </label>
                  <input
                    id="login-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('phonePlaceholder')}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    dir="ltr"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  {loading ? t('sending') : t('sendOtp')}
                </button>

                <button
                  onClick={() => { setStep('type'); setError(''); }}
                  className="w-full text-sm text-neutral-500 hover:text-neutral-700"
                >
                  {t('changePhone')}
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: OTP Verification ── */}
          {step === 'otp' && (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-brand" size={24} />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900">{t('otpTitle')}</h1>
                <p className="text-neutral-500 text-sm mt-2">
                  {t('otpSubtitle', { phone })}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('otpPlaceholder')}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}
                {success && !error && (
                  <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>
                )}

                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="w-full py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  {loading ? t('verifying') : t('verifyOtp')}
                </button>

                <div className="flex justify-between text-sm">
                  <button
                    onClick={() => { setStep('phone'); setCode(''); setError(''); setSuccess(''); }}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    {t('changePhone')}
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-brand hover:text-brand-dark disabled:opacity-50"
                  >
                    {t('resendOtp')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
