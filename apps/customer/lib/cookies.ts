export type CookieConsentType = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_NAME = 'origin_cookie_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

/**
 * Read the cookie consent preferences from the browser cookie.
 * Returns null if the cookie doesn't exist or is invalid.
 * Safe to call server-side (returns null).
 */
export function getCookieConsent(): CookieConsentType | null {
  if (typeof document === 'undefined') return null;

  try {
    const cookies = document.cookie.split(';');
    const match = cookies.find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;

    const value = decodeURIComponent(match.trim().slice(COOKIE_NAME.length + 1));
    const parsed = JSON.parse(value);

    // Validate the shape
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.essential === 'boolean' &&
      typeof parsed.analytics === 'boolean' &&
      typeof parsed.marketing === 'boolean'
    ) {
      return parsed as CookieConsentType;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Persist cookie consent preferences as a browser cookie.
 * Cookie is set with 365-day expiry, path=/, SameSite=Lax.
 */
export function setCookieConsent(consent: CookieConsentType): void {
  if (typeof document === 'undefined') return;

  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}
