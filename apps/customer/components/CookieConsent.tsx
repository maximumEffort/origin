'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getCookieConsent, setCookieConsent, type CookieConsentType } from '@/lib/cookies';

const DEFAULT_CONSENT: CookieConsentType = {
  essential: true,
  analytics: false,
  marketing: false,
};

const ALL_ACCEPTED: CookieConsentType = {
  essential: true,
  analytics: true,
  marketing: true,
};

export default function CookieConsent() {
  const t = useTranslations('cookies');
  const locale = useLocale();

  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookieConsentType>(DEFAULT_CONSENT);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      setVisible(true);
      // Trigger slide-up animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    }
  }, []);

  const saveAndClose = useCallback((consent: CookieConsentType) => {
    setCookieConsent(consent);
    setMounted(false);
    // Wait for exit animation before removing from DOM
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleAcceptAll = useCallback(() => {
    saveAndClose(ALL_ACCEPTED);
  }, [saveAndClose]);

  const handleRejectNonEssential = useCallback(() => {
    saveAndClose(DEFAULT_CONSENT);
  }, [saveAndClose]);

  const handleSavePreferences = useCallback(() => {
    saveAndClose({ ...preferences, essential: true });
  }, [preferences, saveAndClose]);

  const togglePreference = useCallback((key: 'analytics' | 'marketing') => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('ariaLabel')}
      aria-modal="false"
      className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
        mounted ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-[#1B5299] text-white shadow-2xl border-t border-[#0F3A72]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          {/* Main banner */}
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <h2 className="text-base font-semibold mb-1">{t('title')}</h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                {t('description')}{' '}
                <Link
                  href={`/${locale}/privacy`}
                  className="underline underline-offset-2 hover:text-[#C8920A] transition-colors"
                >
                  {t('privacyLink')}
                </Link>
              </p>
            </div>

            {/* Action buttons */}
            {!showPreferences && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 bg-[#C8920A] hover:bg-[#B07F08] text-white text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8920A] focus:ring-offset-2 focus:ring-offset-[#1B5299]"
                >
                  {t('acceptAll')}
                </button>
                <button
                  onClick={handleRejectNonEssential}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-md border border-white/25 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#1B5299]"
                >
                  {t('rejectAll')}
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-5 py-2.5 text-blue-100 hover:text-white text-sm font-medium underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#1B5299] rounded-md"
                >
                  {t('customize')}
                </button>
              </div>
            )}
          </div>

          {/* Preferences panel */}
          {showPreferences && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="space-y-3">
                {/* Essential cookies — always on */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t('necessary')}</p>
                    <p className="text-xs text-blue-200">{t('necessaryDesc')}</p>
                  </div>
                  <div
                    className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#C8920A] opacity-60 cursor-not-allowed"
                    aria-label={t('necessary')}
                  >
                    <span className="inline-block h-4 w-4 rounded-full bg-white translate-x-6 rtl:-translate-x-6 transition-transform" />
                  </div>
                </div>

                {/* Analytics cookies */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t('analytics')}</p>
                    <p className="text-xs text-blue-200">{t('analyticsDesc')}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={preferences.analytics}
                    aria-label={t('analytics')}
                    onClick={() => togglePreference('analytics')}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#1B5299] ${
                      preferences.analytics ? 'bg-[#C8920A]' : 'bg-white/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        preferences.analytics
                          ? 'translate-x-6 rtl:-translate-x-6'
                          : 'translate-x-1 rtl:-translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Marketing cookies */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t('marketing')}</p>
                    <p className="text-xs text-blue-200">{t('marketingDesc')}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={preferences.marketing}
                    aria-label={t('marketing')}
                    onClick={() => togglePreference('marketing')}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#1B5299] ${
                      preferences.marketing ? 'bg-[#C8920A]' : 'bg-white/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        preferences.marketing
                          ? 'translate-x-6 rtl:-translate-x-6'
                          : 'translate-x-1 rtl:-translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Preferences action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-4">
                <button
                  onClick={handleSavePreferences}
                  className="px-5 py-2.5 bg-[#C8920A] hover:bg-[#B07F08] text-white text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#C8920A] focus:ring-offset-2 focus:ring-offset-[#1B5299]"
                >
                  {t('save')}
                </button>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-md border border-white/25 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#1B5299]"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
