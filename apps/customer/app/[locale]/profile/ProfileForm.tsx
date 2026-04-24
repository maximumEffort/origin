'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { User, Mail, Phone, LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { updateProfile } from '@/lib/auth';

export default function ProfileForm({ locale }: { locale: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { customer, loading: authLoading, logout, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Populate form when customer loads
  useEffect(() => {
    if (customer) {
      setName(customer.name ?? '');
      setEmail(customer.email ?? '');
    }
  }, [customer]);

  // Not logged in — redirect to login
  useEffect(() => {
    if (!authLoading && !customer) {
      router.replace(`/${locale}/login?redirect=/${locale}/profile`);
    }
  }, [authLoading, customer, locale, router]);

  if (authLoading || !customer) {
    return (
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-20 min-h-screen">
        <div className="max-w-md mx-auto px-4 text-center text-neutral-400 pt-20">
          {t('saving')}
        </div>
      </section>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateProfile({ name: name || undefined, email: email || undefined });
      await refreshProfile();
      setMessage(t('saved'));
      setMessageType('success');
    } catch {
      setMessage(t('saveError'));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push(`/${locale}`);
  };

  return (
    <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-20 min-h-screen">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-brand" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">{t('profileTitle')}</h1>
            <p className="text-neutral-500 text-sm mt-2">{t('profileSubtitle')}</p>
          </div>

          <div className="space-y-5">
            {/* Phone (read-only) */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <Phone size={14} className="inline me-1" />
                {t('phone')}
              </label>
              <input
                type="tel"
                value={customer.phone}
                disabled
                className="w-full px-4 py-3 border border-neutral-100 rounded-lg text-sm bg-neutral-50 text-neutral-500"
                dir="ltr"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <User size={14} className="inline me-1" />
                {t('name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <Mail size={14} className="inline me-1" />
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                dir="ltr"
              />
              <p className="text-xs text-neutral-500 mt-1.5">{t('emailHint')}</p>
            </div>

            {message && (
              <p className={`text-sm px-3 py-2 rounded-lg ${
                messageType === 'success'
                  ? 'text-green-600 bg-green-50'
                  : 'text-red-600 bg-red-50'
              }`}>
                {message}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {saving ? t('saving') : t('save')}
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-3 border border-neutral-200 text-neutral-600 font-medium rounded-lg hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
