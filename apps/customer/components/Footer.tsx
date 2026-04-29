import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { MessageCircle, Phone, MapPin } from 'lucide-react';

/** Origin logo — white wordmark for dark footer */
function OriginLogoWhite() {
  return (
    <svg
      viewBox="0 0 140 40"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-auto"
      aria-label="Origin"
      role="img"
    >
      <circle cx="122" cy="13" r="7" fill="#F5C200" />
      <line x1="122" y1="2" x2="122" y2="5.5" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="133" y1="13" x2="129.5" y2="13" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="111" y1="13" x2="114.5" y2="13" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="129.8" y1="5.2" x2="127.3" y2="7.7" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="114.2" y1="5.2" x2="116.7" y2="7.7" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="129.8" y1="20.8" x2="127.3" y2="18.3" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="114.2" y1="20.8" x2="116.7" y2="18.3" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 34 Q50 40 100 32" stroke="#C8920A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <text
        x="2"
        y="28"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="26"
        fill="#FFFFFF"
        letterSpacing="-0.5"
      >
        Origin
      </text>
    </svg>
  );
}

export default async function Footer() {
  const [t, locale] = await Promise.all([
    getTranslations('footer'),
    getLocale(),
  ]);

  return (
    <footer style={{ background: '#0A0F1E' }} className="text-neutral-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <div className="mb-4">
              <OriginLogoWhite />
            </div>
            <p className="text-sm leading-relaxed mb-2 text-neutral-400">{t('tagline')}</p>
            <p className="text-sm text-gold-text italic mb-5">{t('ecoTagline')}</p>
            {/* Language switcher */}
            <div className="flex gap-2">
              {(['en', 'ar', 'zh-CN'] as const).map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    l === locale
                      ? 'border-brand bg-brand/20 text-white'
                      : 'border-white/10 text-neutral-500 hover:text-white hover:border-white/20'
                  }`}
                >
                  {l === 'en' ? 'EN' : l === 'ar' ? 'ع' : '中'}
                </Link>
              ))}
            </div>
          </div>

          {/* Fleet */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-5">{t('fleetTitle')}</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={`/${locale}/cars?category=electric`} className="hover:text-white transition-colors">{t('fleetElectric')}</Link></li>
              <li><Link href={`/${locale}/cars?category=suv`} className="hover:text-white transition-colors">{t('fleetSuv')}</Link></li>
              <li><Link href={`/${locale}/cars?category=sedan`} className="hover:text-white transition-colors">{t('fleetSedan')}</Link></li>
              <li><Link href={`/${locale}/cars?category=pickup`} className="hover:text-white transition-colors">{t('fleetPickup')}</Link></li>
              <li><Link href={`/${locale}/calculator`} className="hover:text-white transition-colors">{t('calcLink')}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-5">{t('legal')}</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={`/${locale}/about`} className="hover:text-white transition-colors">{t('aboutLink')}</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-white transition-colors">{t('contact')}</Link></li>
              <li><Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">{t('privacy')}</Link></li>
              <li><Link href={`/${locale}/terms`} className="hover:text-white transition-colors">{t('terms')}</Link></li>
              <li><Link href={`/${locale}/rta`} className="hover:text-white transition-colors">{t('rta')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-5">{t('contact')}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://wa.me/971521439746"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 hover:text-white transition-colors"
                >
                  <MessageCircle size={15} className="text-[#25D366] shrink-0" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="tel:+971521439746" className="flex items-center gap-2.5 hover:text-white transition-colors">
                  <Phone size={15} className="text-brand-light shrink-0" />
                  +971 52 143 9746
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-brand-light shrink-0 mt-0.5" />
                  <span>{t('address')}<br /><span className="text-xs text-neutral-600">{t('addressSub')}</span></span>
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-neutral-600">
          <p>{t('copyright')}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 justify-center sm:justify-end">
            <span>{t('vatNote')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('trn')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('licence')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
