import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://origin-auto.ae';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/booking/', '/login/', '/portal/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
