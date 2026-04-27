/**
 * Confidence badge — green/amber/red shading per OCR confidence.
 *
 * Thresholds match the backend (settings.kyc_ocr_min_confidence_admin_*):
 *   ≥ 0.85 → green ✓
 *   0.7–0.85 → amber ⚠
 *   < 0.7 → red 🚩
 *
 * Used in the KYC review page next to each OCR-extracted field.
 */

import clsx from 'clsx';

export const GREEN_THRESHOLD = 0.85;
export const RED_THRESHOLD = 0.7;

export type ConfidenceTier = 'green' | 'amber' | 'red' | 'unknown';

export function tierForConfidence(c: number | null | undefined): ConfidenceTier {
  if (c == null) return 'unknown';
  if (c >= GREEN_THRESHOLD) return 'green';
  if (c >= RED_THRESHOLD) return 'amber';
  return 'red';
}

interface Props {
  confidence: number | null | undefined;
  showPercent?: boolean;
}

const styles: Record<ConfidenceTier, string> = {
  green: 'bg-green-50 text-green-700 ring-green-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  unknown: 'bg-gray-100 text-gray-500 ring-gray-200',
};

const icons: Record<ConfidenceTier, string> = {
  green: '✓',
  amber: '⚠',
  red: '⚑',
  unknown: '·',
};

export default function ConfidenceBadge({ confidence, showPercent = true }: Props) {
  const tier = tierForConfidence(confidence);
  const pct = confidence == null ? '—' : `${Math.round(confidence * 100)}%`;
  return (
    <span
      title={confidence == null ? 'No confidence data' : `OCR confidence ${pct}`}
      className={clsx(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1',
        styles[tier],
      )}
    >
      <span aria-hidden>{icons[tier]}</span>
      {showPercent && <span className="tabular-nums">{pct}</span>}
    </span>
  );
}
