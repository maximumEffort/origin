/**
 * Tests for lib/format.ts.
 */
import { fmtDate, fmtAed } from '@/lib/format';

describe('fmtDate', () => {
  it('formats a date-only string as DD/MM/YYYY', () => {
    expect(fmtDate('2026-05-01')).toBe('01/05/2026');
  });

  it('renders date-only strings in UTC, not the runtime timezone (PR #155 Codex P1)', () => {
    // The Codex review reproducer: in negative-UTC offsets,
    // `new Date('2026-05-01')` is UTC midnight, and toLocaleDateString
    // would render it as the previous day. Force the test process
    // into a Pacific timezone and confirm the day does NOT shift.
    const original = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      // The bug rendered '30/04/2026' here; the fix renders '01/05/2026'.
      expect(fmtDate('2026-05-01')).toBe('01/05/2026');
      expect(fmtDate('2026-01-01')).toBe('01/01/2026');
    } finally {
      process.env.TZ = original;
    }
  });

  it('returns dash for null / undefined / empty', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate(undefined)).toBe('—');
    expect(fmtDate('')).toBe('—');
  });

  it('returns the input unchanged for unparseable strings', () => {
    expect(fmtDate('not-a-date')).toBe('not-a-date');
  });
});

describe('fmtAed', () => {
  it('renders the label + locale-formatted thousands', () => {
    expect(fmtAed(8500, 'AED')).toBe('AED 8,500');
  });

  it('parses a numeric string', () => {
    expect(fmtAed('12345.67', 'AED')).toBe('AED 12,345.67');
  });

  it('returns dash for null / undefined / empty', () => {
    expect(fmtAed(null, 'AED')).toBe('—');
    expect(fmtAed(undefined, 'AED')).toBe('—');
    expect(fmtAed('', 'AED')).toBe('—');
  });

  it('returns the original input for non-finite values', () => {
    expect(fmtAed('not-a-number', 'AED')).toBe('not-a-number');
  });
});
