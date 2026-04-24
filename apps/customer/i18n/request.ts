import { getRequestConfig } from 'next-intl/server';

/**
 * Map locale codes to their translation file names.
 * zh-CN uses the zh-CN.json file (renamed from zh.json for CLDR compliance).
 */
const localeFileMap: Record<string, string> = {
  en: 'en',
  ar: 'ar',
  'zh-CN': 'zh-CN',
};

export default getRequestConfig(async ({ requestLocale }) => {
  // Use the new async requestLocale API (replaces deprecated { locale } param)
  const locale = await requestLocale;
  const file = localeFileMap[locale ?? 'en'] ?? 'en';

  return {
    locale,
    messages: (await import(`../locales/${file}.json`)).default,
  };
});
