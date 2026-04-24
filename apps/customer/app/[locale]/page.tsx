import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import TrustBadges from '@/components/TrustBadges';
import CarCard from '@/components/CarCard';
import { ArrowRight, Car, FileText, Key, MessageCircle, Calculator } from 'lucide-react';
import { fetchVehicles } from '@/lib/api';
import { STATIC_VEHICLES } from '@/lib/static-vehicles';

/** Correct known backend data errors (e.g. "WRX" should be "Seal"). */
const MODEL_CORRECTIONS: Record<string, string> = {
  WRX: 'Seal',
};

function mapApiVehicle(v: {
  id: string;
  brand: string;
  model: string;
  monthlyRateAed: number;
  status: string;
  images?: { url: string; isPrimary: boolean }[];
  category?: { nameEn: string } | null;
}) {
  const img = v.images?.find((i) => i.isPrimary) ?? v.images?.[0];
  return {
    id: v.id,
    brand: v.brand,
    model: MODEL_CORRECTIONS[v.model] ?? v.model,
    category: v.category?.nameEn ?? '',
    monthlyAed: v.monthlyRateAed,
    imageUrl: img?.url ?? '',
    available: v.status === 'AVAILABLE',
  };
}

type CarCardData = ReturnType<typeof mapApiVehicle>;

async function getFeaturedCars(): Promise<CarCardData[]> {
  try {
    const res = await fetchVehicles({ limit: 20 });
    if (res.data?.length) {
      const mapped = res.data.map(mapApiVehicle);
      // Deduplicate by brand+model so the same model doesn't appear twice
      const seen = new Set<string>();
      const unique = mapped.filter((c) => {
        const key = `${c.brand}-${c.model}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return unique.slice(0, 4);
    }
  } catch (err) {
    console.warn('[Origin] API unreachable, using static data:', (err as Error).message);
  }
  return STATIC_VEHICLES.filter((v) => v.available).slice(0, 4).map((v) => ({
    id: v.id,
    brand: v.brand,
    model: v.model,
    category: v.category,
    monthlyAed: v.monthlyAed,
    imageUrl: v.imageUrl,
    available: v.available,
  }));
}

const BRANDS = [
  { name: 'NIO', taglineKey: 'nioTagline', emoji: '⚡' },
  { name: 'Voyah', taglineKey: 'voyahTagline', emoji: '🌊' },
  { name: 'Zeekr', taglineKey: 'zeekrTagline', emoji: '🚀' },
  { name: 'BYD', taglineKey: 'bydTagline', emoji: '🔋' },
] as const;

const STEP_ICONS = [Car, FileText, Key] as const;

export default async function HomePage() {
  const [t, locale, featuredCars] = await Promise.all([
    getTranslations(),
    getLocale(),
    getFeaturedCars(),
  ]);

  const heroCard = featuredCars[0];

  const howItWorks = [
    { step: '01', Icon: STEP_ICONS[0], title: t('home.step1Title'), desc: t('home.step1Desc') },
    { step: '02', Icon: STEP_ICONS[1], title: t('home.step2Title'), desc: t('home.step2Desc') },
    { step: '03', Icon: STEP_ICONS[2], title: t('home.step3Title'), desc: t('home.step3Desc') },
  ];

  const stats = [
    { value: t('home.stat1Value'), label: t('home.stat1Label') },
    { value: t('home.stat2Value'), label: t('home.stat2Label') },
    { value: t('home.stat3Value'), label: t('home.stat3Label') },
  ];

  const categoryFilters = [
    { key: 'all',      label: t('fleet.filterAll'),      href: `/${locale}/cars` },
    { key: 'electric', label: t('fleet.filterElectric'), href: `/${locale}/cars?category=electric` },
    { key: 'suv',      label: t('fleet.filterSuv'),      href: `/${locale}/cars?category=suv` },
    { key: 'sedan',    label: t('fleet.filterSedan'),    href: `/${locale}/cars?category=sedan` },
    { key: 'pickup',   label: t('fleet.filterPickup'),   href: `/${locale}/cars?category=pickup` },
  ];

  const brandTaglines: Record<string, string> = {
    NIO:    t('home.nioTagline'),
    Voyah:  t('home.voyahTagline'),
    Zeekr:  t('home.zeekrTagline'),
    BYD:    t('home.bydTagline'),
  };

  return (
    <>
      <Navbar />
      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        {/* bg-hero (#060B14) via Tailwind class — avoids CSP nonce blocking inline styles */}
        <section
          className="relative min-h-screen flex flex-col overflow-hidden bg-hero"
        >
          {/* Dot grid */}
          <div className="absolute inset-0 hero-grid pointer-events-none" />
          {/* Brand glows */}
          <div className="absolute -top-32 -start-32 w-[600px] h-[600px] bg-brand/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 end-0 w-[400px] h-[400px] bg-brand-dark/20 rounded-full blur-3xl pointer-events-none" />

          {/* Main content */}
          <div className="relative flex-1 flex items-center">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
              <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">

                {/* Left — text */}
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/20 border border-brand/35 text-xs font-medium text-white/70 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-bright" />
                    {t('home.heroBadge')}
                  </span>

                  <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.15] tracking-tight mb-6">
                    {t('hero.headline')}
                  </h1>

                  <p className="text-base sm:text-lg text-white/55 leading-relaxed mb-8 max-w-xl">
                    {t('hero.subheadline')}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mb-10">
                    <Link
                      href={`/${locale}/cars`}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-all duration-200 shadow-lg shadow-brand/25"
                    >
                      {t('hero.ctaBrowse')}
                      <ArrowRight size={16} />
                    </Link>
                    <Link
                      href={`/${locale}/calculator`}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-white font-medium rounded-xl border border-white/15 hover:bg-white/10 transition-all duration-200"
                    >
                      <Calculator size={16} />
                      {t('hero.ctaCalculator')}
                    </Link>
                  </div>

                  {/* Trust signals */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {[t('hero.trustBadge1'), t('hero.trustBadge2'), t('hero.trustBadge3')].map((badge) => (
                      <span key={badge} className="flex items-center gap-2 text-sm text-white/45">
                        <span className="text-gold">✓</span>
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right — featured car card */}
                <div className="hidden lg:flex items-center justify-center">
                  <div className="relative w-full max-w-[420px]">
                    <div className="absolute inset-[-8px] bg-brand/15 rounded-3xl blur-2xl" />
                    <div className="relative bg-white/[0.05] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                      <div className="aspect-[16/10] relative bg-gradient-to-br from-brand/20 to-hero">
                        {heroCard?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={heroCard.imageUrl}
                            alt={`${heroCard.brand} ${heroCard.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car size={72} className="text-white/15" />
                          </div>
                        )}
                        {heroCard && (
                          <div className="absolute top-4 end-4 bg-gold-bright text-neutral-900 text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                            AED {heroCard.monthlyAed.toLocaleString()}
                            <span className="font-normal text-xs opacity-70">/mo</span>
                          </div>
                        )}
                      </div>
                      {heroCard && (
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] text-white/35 uppercase tracking-widest mb-0.5">{heroCard.brand}</p>
                            <p className="text-white font-semibold">{heroCard.model}</p>
                          </div>
                          <span className="text-xs bg-green-500/15 text-green-400 px-2.5 py-1 rounded-full font-medium border border-green-500/20">
                            {t('fleet.available')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="relative border-t border-white/[0.07] bg-white/[0.03]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
              <div className="grid grid-cols-3 divide-x divide-white/10">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center px-4">
                    <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-white/35 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FLEET PREVIEW ─────────────────────────────────────────────── */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                {/* text-gold-text: #966A07 on white — WCAG AA 4.8:1 */}
                <p className="text-gold-text font-semibold text-sm uppercase tracking-widest mb-2">{t('home.fleetEyebrow')}</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">{t('fleet.title')}</h2>
              </div>
              <Link
                href={`/${locale}/cars`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark transition-colors shrink-0"
              >
                {t('home.viewAll')} <ArrowRight size={14} />
              </Link>
            </div>

            {/* Category tab-links */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {categoryFilters.map(({ key, label, href }) => (
                <Link
                  key={key}
                  href={href}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    key === 'all'
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-brand-light hover:text-brand'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredCars.map((car) => (
                <CarCard key={car.id} {...car} />
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="py-20 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              {/* text-gold-text on neutral-50 (4.8:1) */}
              <p className="text-gold-text font-semibold text-sm uppercase tracking-widest mb-2">{t('home.processEyebrow')}</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">{t('home.processTitle')}</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {howItWorks.map(({ step, Icon, title, desc }) => (
                <div key={step} className="relative bg-white rounded-2xl p-8 border border-neutral-100 shadow-sm">
                  <div className="absolute -top-3.5 start-7 bg-gold-bright text-neutral-900 text-xs font-bold px-3 py-1 rounded-full">
                    {step}
                  </div>
                  <div className="w-11 h-11 bg-brand-light rounded-xl flex items-center justify-center mb-5 mt-2">
                    <Icon size={20} className="text-brand" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-green-50 border border-green-200/60 rounded-2xl px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-[#25D366] rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle size={20} className="text-white" fill="white" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 text-sm">{t('home.waTitle')}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{t('home.waSubtitle')}</p>
                </div>
              </div>
              <a
                href="https://wa.me/971521439746"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white text-sm font-medium rounded-xl hover:bg-[#1ebe5d] transition-colors"
              >
                <MessageCircle size={15} fill="white" />
                {t('home.waCta')}
              </a>
            </div>
          </div>
        </section>

        {/* ── BRANDS ────────────────────────────────────────────────────── */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              {/* text-gold-text on white (4.8:1) */}
              <p className="text-gold-text font-semibold text-sm uppercase tracking-widest mb-2">{t('home.brandsEyebrow')}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
                {t('home.brandsTitle')}
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {BRANDS.map(({ name, emoji }) => (
                <Link
                  key={name}
                  href={`/${locale}/cars?brand=${name.toLowerCase()}`}
                  className="brand-pill group flex items-center gap-4 bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-4 hover:border-brand/30 hover:bg-brand-light/40 min-w-[180px]"
                >
                  <span className="text-2xl">{emoji}</span>
                  <div className="text-start">
                    <p className="font-bold text-neutral-900 text-sm group-hover:text-brand transition-colors">{name}</p>
                    <p className="text-xs text-neutral-500">{brandTaglines[name]}</p>
                  </div>
                  <ArrowRight size={13} className="text-neutral-300 group-hover:text-brand transition-colors ms-auto" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY ORIGIN ────────────────────────────────────────────────── */}
        <TrustBadges />

        {/* ── CALCULATOR TEASER ─────────────────────────────────────────── */}
        {/* bg-hero (#060B14) via Tailwind class — avoids CSP nonce blocking inline styles */}
        <section className="py-20 relative overflow-hidden bg-hero">
          <div className="absolute inset-0 hero-grid opacity-40 pointer-events-none" />
          <div className="absolute end-0 top-0 w-[480px] h-[480px] bg-brand/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="w-12 h-12 bg-gold-bright/10 rounded-xl flex items-center justify-center mb-6 border border-gold-bright/20">
                <Calculator size={22} className="text-gold-bright" />
              </div>
              {/* text-gold on #060B14 — ~6.75:1 contrast — passes WCAG AA */}
              <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">{t('home.calcEyebrow')}</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {t('home.calcTitle')}
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                {t('home.calcSubtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/${locale}/calculator`}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/25"
                >
                  <Calculator size={16} />
                  {t('home.calcCta1')}
                </Link>
                <Link
                  href={`/${locale}/contact`}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-white font-medium rounded-xl border border-white/15 hover:bg-white/10 transition-all"
                >
                  {t('home.calcCta2')}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
