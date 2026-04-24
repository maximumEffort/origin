'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, User, LogIn } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import clsx from 'clsx';

const localeLabels: Record<string, string> = { en: 'EN', ar: 'ع', 'zh-CN': '中文' };

/** Origin logo — text colour adapts to scrolled state */
function OriginLogo({ scrolled }: { scrolled: boolean }) {
  const textFill = scrolled ? '#163478' : '#FFFFFF';
  return (
    <svg
      viewBox="0 0 140 40"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-auto"
      aria-label="Origin"
      role="img"
    >
      {/* Sun circle */}
      <circle cx="122" cy="13" r="7" fill="#F5C200" />
      {/* Sun rays */}
      <line x1="122" y1="2" x2="122" y2="5.5" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="133" y1="13" x2="129.5" y2="13" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="111" y1="13" x2="114.5" y2="13" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="129.8" y1="5.2" x2="127.3" y2="7.7" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="114.2" y1="5.2" x2="116.7" y2="7.7" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="129.8" y1="20.8" x2="127.3" y2="18.3" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      <line x1="114.2" y1="20.8" x2="116.7" y2="18.3" stroke="#F5C200" strokeWidth="2" strokeLinecap="round" />
      {/* Swoosh under wordmark */}
      <path d="M2 34 Q50 40 100 32" stroke="#C8920A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Wordmark */}
      <text
        x="2"
        y="28"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="700"
        fontSize="26"
        fill={textFill}
        letterSpacing="-0.5"
      >
        Origin
      </text>
    </svg>
  );
}

export default function Navbar() {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const pathname = usePathname();
  const { customer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Transparent hero nav only on the homepage; all inner pages start solid.
  const isHomePage = pathname === `/${locale}` || pathname === `/${locale}/`;
  const [scrolled, setScrolled] = useState(!isHomePage);

  useEffect(() => {
    if (!isHomePage) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll(); // run on mount in case page is already scrolled
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHomePage]);

  const links = [
    { href: `/${locale}/cars`, label: t('fleet') },
    { href: `/${locale}/calculator`, label: t('calculator') },
    { href: `/${locale}/about`, label: t('about') },
    { href: `/${locale}/contact`, label: t('contact') },
  ];

  const linkClass = clsx(
    'text-sm font-medium transition-colors duration-200',
    scrolled ? 'text-neutral-600 hover:text-brand' : 'text-white/75 hover:text-white'
  );

  return (
    <header
      className={clsx(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center">
            <OriginLogo scrolled={scrolled} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                aria-expanded={langOpen}
                aria-haspopup="listbox"
                className={clsx(
                  'flex items-center gap-1 text-sm px-2 py-1 rounded transition-colors duration-200',
                  scrolled ? 'text-neutral-600 hover:text-brand' : 'text-white/70 hover:text-white'
                )}
              >
                {localeLabels[locale]}
                <ChevronDown size={13} />
              </button>
              {langOpen && (
                <div className="absolute end-0 mt-1 w-28 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
                  {(['en', 'ar', 'zh-CN'] as const).map((l) => {
                    // Preserve current path when switching language
                    const pathWithoutLocale = pathname.startsWith(`/${locale}`) ? pathname.slice(locale.length + 1) || '/' : '/';
                    return (
                    <Link
                      key={l}
                      href={`/${l}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`}
                      onClick={() => setLangOpen(false)}
                      className={clsx(
                        'block px-4 py-2 text-sm hover:bg-neutral-50 transition-colors',
                        l === locale ? 'text-brand font-medium' : 'text-neutral-600'
                      )}
                    >
                      {l === 'en' ? 'English' : l === 'ar' ? 'العربية' : '中文'}
                    </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Auth button */}
            <Link
              href={customer ? `/${locale}/dashboard` : `/${locale}/login`}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200',
                scrolled
                  ? 'text-neutral-600 hover:text-brand hover:bg-neutral-50'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
              title={customer ? tAuth('myAccount') : tAuth('loginTitle')}
            >
              {customer ? <User size={18} /> : <LogIn size={18} />}
              <span className="hidden sm:inline">
                {customer ? (customer.name || tAuth('myAccount')) : tAuth('loginTitle')}
              </span>
            </Link>

            {/* Get a Quote CTA */}
            <Link
              href={`/${locale}/contact`}
              className={clsx(
                'hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                scrolled
                  ? 'bg-brand text-white hover:bg-brand-dark shadow-sm'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              )}
            >
              {t('cta')}
            </Link>

            {/* Mobile menu toggle */}
            <button
              className={clsx(
                'md:hidden p-2 transition-colors',
                scrolled ? 'text-neutral-600' : 'text-white'
              )}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu — always white bg for readability */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-neutral-100 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 px-2 text-sm text-neutral-600 hover:text-brand border-b border-neutral-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={customer ? `/${locale}/dashboard` : `/${locale}/login`}
              onClick={() => setMenuOpen(false)}
              className="block py-3 px-2 text-sm text-neutral-600 hover:text-brand border-b border-neutral-50"
            >
              {customer ? tAuth('myAccount') : tAuth('loginTitle')}
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="mt-4 block text-center px-4 py-2.5 text-sm font-medium text-white bg-brand rounded-lg"
            >
              {t('cta')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
