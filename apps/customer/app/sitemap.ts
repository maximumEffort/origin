import { MetadataRoute } from 'next';

const locales = ['en', 'ar', 'zh-CN'];

const staticPaths = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
  { path: '/cars', priority: 0.9, changeFrequency: 'daily' as const },
  { path: '/calculator', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/rta', priority: 0.4, changeFrequency: 'yearly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';
  const lastModified = new Date();

  return locales.flatMap((locale) =>
    staticPaths.map(({ path, priority, changeFrequency }) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
    }))
  );
}
