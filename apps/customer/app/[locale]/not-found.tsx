import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const locale = useLocale();
  const t = useTranslations('notFound');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 display */}
        <div className="mb-6">
          <span className="text-8xl font-black text-brand/30">404</span>
        </div>

        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-6">
          <Search size={32} className="text-brand" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          {t('title')}
        </h1>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          {t('description')}
        </p>

        {/* CTA */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors"
        >
          <ArrowLeft size={16} className={locale === 'ar' ? 'rtl-flip' : ''} />
          {t('goHome')}
        </Link>

        {/* Origin branding */}
        <p className="mt-12 text-xs text-neutral-600">
          Origin — Premium Chinese Car Leasing in Dubai
        </p>
      </div>
    </div>
  );
}
