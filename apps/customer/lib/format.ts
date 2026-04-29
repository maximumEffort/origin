/**
 * Locale-aware UI formatters used across customer pages.
 *
 * Two design rules baked in here:
 *
 * 1. **DD/MM/YYYY everywhere** — UAE standard per CLAUDE.md. Backend ships
 *    ISO; we render UAE-format. Bug: checkout/page.tsx and dashboard had
 *    drift between hand-rolled formatters; this consolidates.
 *
 * 2. **Currency strings always go through `t('common.aed')`** — Arabic must
 *    render `د.إ`, English/Chinese render `AED`. Don't hardcode "AED " in
 *    components; call `fmtAed(amount, t('common.aed'))` instead.
 *
 * Audit refs: #139 §2 (date format), §11 (AED currency), §12 (toLocaleString
 * without locale).
 */

/**
 * Format an ISO date as DD/MM/YYYY (UAE standard).
 *
 * The locale code is ignored for the format itself — UAE uses DD/MM/YYYY
 * regardless of UI language — but Intl applies locale-correct numerals
 * (Arabic-Indic digits in `ar` if the runtime supplies them).
 *
 * Returns the input unchanged on parse failure rather than throwing.
 *
 * Timezone correctness: a date-only string like `"2026-05-01"` is
 * parsed by JS as UTC midnight, then `toLocaleDateString` localizes
 * it to the runtime's timezone — which silently shifts the displayed
 * day in negative-UTC offsets (Pacific would show 30/04/2026 for an
 * input of 2026-05-01). Booking dates are date-only, so we detect
 * that shape and format in UTC to keep the displayed day stable
 * regardless of where the page is rendered.
 */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function fmtDate(iso: string | null | undefined, locale = 'en-GB'): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const opts: Intl.DateTimeFormatOptions | undefined = DATE_ONLY_RE.test(iso)
      ? { timeZone: 'UTC' }
      : undefined;
    return d.toLocaleDateString(locale, opts);
  } catch {
    return iso;
  }
}

/**
 * Format an AED amount with locale-correct thousands separators.
 *
 * Pass the localised currency label (`t('common.aed')`) — this function
 * does not pull from i18n directly because a) it's pure, and b) the
 * caller already has `t` in scope.
 */
export function fmtAed(
  amount: number | string | null | undefined,
  aedLabel: string,
  locale = 'en-US',
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return String(amount);
  return `${aedLabel} ${n.toLocaleString(locale)}`;
}
