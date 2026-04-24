import '@testing-library/jest-dom';

// ── Mock next-intl ──────────────────────────────────────────────────────────

// Client-side hooks
jest.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.has = (key: string) => true;
    return t;
  },
  useLocale: () => 'en',
}));

// Server-side helpers (used by Footer, CarCard)
jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace?: string) => {
    const t = (key: string) => key;
    t.has = (key: string) => true;
    return t;
  },
  getLocale: async () => 'en',
}));

// ── Mock next/navigation ────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
}));

// ── Mock next/link ──────────────────────────────────────────────────────────

jest.mock('next/link', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
      React.createElement('a', { href, ...rest }, children),
  };
});

// ── Mock next/image ─────────────────────────────────────────────────────────

jest.mock('next/image', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => React.createElement('img', props),
  };
});
