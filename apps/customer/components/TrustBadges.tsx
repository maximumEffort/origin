import { getTranslations } from 'next-intl/server';
import { Car, ShieldCheck, Clock, Truck, CheckCircle2 } from 'lucide-react';

/**
 * TrustBadges / Why Origin section.
 * Async server component — uses getTranslations from next-intl/server.
 */
export default async function TrustBadges() {
  const t = await getTranslations('trust');

  const features = [
    {
      icon: Car,
      title: t('rtaTitle'),
      desc: t('rtaDesc'),
      iconBg: 'bg-brand-light',
      iconColor: 'text-brand',
    },
    {
      icon: ShieldCheck,
      title: t('insuranceTitle'),
      desc: t('insuranceDesc'),
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: Clock,
      title: t('flexible'),
      desc: t('flexibleDesc'),
      iconBg: 'bg-gold-light',
      iconColor: 'text-gold-text',
    },
    {
      icon: Truck,
      title: t('delivery'),
      desc: t('deliveryDesc'),
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <section className="py-20 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <p className="text-gold-text font-semibold text-sm uppercase tracking-widest mb-2">{t('title')}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">{t('subtitle')}</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">

          {/* 2×2 feature grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm hover:shadow-md hover:border-brand/15 transition-all duration-200"
              >
                <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={20} className={iconColor} />
                </div>
                <h3 className="font-semibold text-neutral-900 text-sm mb-1.5">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Everything Included highlight card */}
          <div
            className="rounded-2xl p-8 flex flex-col justify-center"
            style={{ background: '#0E2356' }}
          >
            <p className="text-gold-bright text-sm font-semibold uppercase tracking-widest mb-3">
              {t('includedBadge')}
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-snug whitespace-pre-line">
              {t('includedTitle')}
            </h3>
            <p className="text-white/50 text-sm leading-relaxed mb-7">
              {t('includedDesc')}
            </p>
            <ul className="space-y-3">
              {[t('included1'), t('included2'), t('included3'), t('included4'), t('included5')].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/75">
                  <CheckCircle2 size={16} className="text-gold-bright shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
