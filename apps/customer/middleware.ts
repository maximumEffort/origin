import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar', 'zh-CN'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

/**
 * Middleware that chains next-intl locale routing with security headers.
 * Also redirects legacy /zh routes to /zh-CN and /fleet to /cars.
 *
 * CSP uses per-request nonces for inline scripts. Next.js 15 reads the
 * `x-nonce` response header and automatically applies it to framework-
 * injected inline <script> tags during rendering.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy /zh/* routes to /zh-CN/*
  if (pathname === '/zh' || pathname.startsWith('/zh/')) {
    const newPathname = pathname.replace(/^\/zh/, '/zh-CN');
    const url = request.nextUrl.clone();
    url.pathname = newPathname;
    return NextResponse.redirect(url, 308);
  }

  // Redirect /fleet to /cars (with or without locale prefix)
  if (
    pathname === '/fleet' ||
    pathname.startsWith('/fleet/') ||
    /^\/(en|ar|zh-CN)\/fleet(\/|$)/.test(pathname)
  ) {
    const newPathname = pathname.replace(/\/fleet/, '/cars');
    const url = request.nextUrl.clone();
    url.pathname = newPathname;
    return NextResponse.redirect(url, 308);
  }

  const response = intlMiddleware(request);

  // Generate a unique nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Nonce-based Content Security Policy
  // - 'strict-dynamic' lets nonced scripts load additional scripts (Next.js chunks)
  // - 'unsafe-inline' is kept for styles only (low risk, avoids font/CSS issues)
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://car-leasing-business-production.up.railway.app https://api.stripe.com https://*.sentry.io",
    "frame-src https://wa.me https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  // x-nonce header is read by Next.js 15 to inject nonce into inline scripts
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
