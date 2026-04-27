/**
 * Admin KYC review page (ADR-0002 Phase B).
 *
 * URL: /customers/{id}/kyc
 *
 * Three-column layout per document:
 *   1. Image preview (or "open in new tab" link for PDFs)
 *   2. OCR-extracted fields (with confidence badges)
 *   3. Customer-entered fields (from Customer profile + admin's edits)
 *
 * Per-field workflow:
 *   - Green check  ⇒ OCR matches customer; admin can one-click approve
 *   - Amber warn   ⇒ OCR-customer mismatch but plausible; admin reviews
 *   - Red flag     ⇒ low confidence or hard-field mismatch; admin must override
 *
 * The actual interactive component is in KycReview.tsx (client). This file
 * is the route boundary + metadata.
 */

import KycReview from './KycReview';

export const dynamic = 'force-dynamic';

export default async function KycReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <KycReview customerId={id} />;
}
