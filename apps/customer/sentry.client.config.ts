// Sentry client config — temporarily removed to fix hydration.
// @sentry/nextjs ^10.47.0 was a phantom version that broke the bundle.
// Re-add when Sentry DSN is configured with a valid @sentry/nextjs version.
//
// To re-enable:
// 1. npm install @sentry/nextjs@latest
// 2. Restore this file with Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })
// 3. Set NEXT_PUBLIC_SENTRY_DSN in Vercel env vars

export {};
