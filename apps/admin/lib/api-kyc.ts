/**
 * Typed API client for the KYC OCR endpoints (ADR-0002 Phase A).
 *
 * Wraps the existing `api` helper in lib/api.ts. The shapes here match
 * apps/backend/src/origin_backend/kyc/schemas.py and customers/schemas.py
 * (`DocumentResponse`).
 */

import { api } from './api';

// ── Types ─────────────────────────────────────────────────────────

export type OcrStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type DocumentType = 'EMIRATES_ID' | 'DRIVING_LICENCE' | 'VISA' | 'PASSPORT';
export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface OcrField {
  value: string;
  confidence: number;
}

export type OcrFields = Record<string, OcrField | string | unknown>;

export interface AdminDocument {
  id: string;
  customerId: string;
  type: DocumentType;
  fileUrl: string;
  expiryDate: string | null;
  status: DocumentStatus;
  rejectionReason: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;

  ocrStatus: OcrStatus;
  ocrProvider: string | null;
  ocrModel: string | null;
  ocrFields: OcrFields | null;
  ocrConfidence: number | null;
  ocrRequestedAt: string | null;
  ocrCompletedAt: string | null;
  ocrFailureReason: string | null;
  reviewerOverrides: Record<string, string> | null;
}

export interface AdminCustomerDetail {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  nationality: string | null;
  preferredLanguage: string;
  kycStatus: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  kycRejectionReason: string | null;
  whatsappOptIn: boolean;
  documents: AdminDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ReocrResponse {
  documentId: string;
  ocrStatus: OcrStatus;
  enqueuedAt: string;
}

export interface ApproveResponse {
  documentId: string;
  status: DocumentStatus;
  reviewedAt: string;
  reviewedBy: string;
  overridesCount: number;
}

export interface RejectResponse {
  documentId: string;
  status: DocumentStatus;
  rejectionReason: string;
  reviewedAt: string;
  reviewedBy: string;
}

// ── Calls ─────────────────────────────────────────────────────────

export const kycApi = {
  /** GET /admin/customers/{id} — full profile + documents (with OCR fields). */
  getCustomer: (customerId: string) =>
    api.get<AdminCustomerDetail>(`/admin/customers/${customerId}`),

  /** POST /admin/documents/{id}/reocr — re-trigger OCR. */
  reocr: (documentId: string) =>
    api.post<ReocrResponse>(`/admin/documents/${documentId}/reocr`),

  /**
   * POST /admin/documents/{id}/approve.
   * `overrides` is the set of per-field corrections the admin made; null
   * (or empty) means "OCR accepted as-is".
   */
  approve: (documentId: string, overrides?: Record<string, string>) =>
    api.post<ApproveResponse>(`/admin/documents/${documentId}/approve`, {
      overrides:
        overrides && Object.keys(overrides).length > 0 ? overrides : undefined,
    }),

  /** POST /admin/documents/{id}/reject — reason required. */
  reject: (documentId: string, reason: string) =>
    api.post<RejectResponse>(`/admin/documents/${documentId}/reject`, { reason }),
};

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Pull a `{value, confidence}` pair out of ocrFields for a given key.
 * Returns nulls if the key is missing or the value isn't shaped that way
 * (e.g., for visa where ocrFields is just rawText/keyValuePairs).
 */
export function getOcrField(
  fields: OcrFields | null,
  key: string,
): { value: string | null; confidence: number | null } {
  if (!fields) return { value: null, confidence: null };
  const f = fields[key];
  if (f && typeof f === 'object' && 'value' in f && 'confidence' in f) {
    return {
      value: String((f as OcrField).value),
      confidence: Number((f as OcrField).confidence),
    };
  }
  return { value: null, confidence: null };
}

/**
 * Field schema per document type — drives which rows the review UI shows.
 * Order matters: most-important field first.
 */
export const FIELD_SCHEMA: Record<DocumentType, { key: string; label: string }[]> = {
  EMIRATES_ID: [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'documentNumber', label: 'EID Number' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'dateOfExpiration', label: 'Expiry Date' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'sex', label: 'Sex' },
  ],
  PASSPORT: [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'documentNumber', label: 'Passport No.' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'dateOfExpiration', label: 'Expiry Date' },
    { key: 'countryRegion', label: 'Country' },
  ],
  DRIVING_LICENCE: [
    { key: 'fullName', label: 'Full Name' },
    { key: 'licenceNumber', label: 'Licence No.' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'issueDate', label: 'Issue Date' },
    { key: 'expiryDate', label: 'Expiry Date' },
    { key: 'placeOfIssue', label: 'Place of Issue' },
  ],
  VISA: [
    // Visa is layout-only in V1 — no structured per-field rows. The review
    // UI falls back to "open document, manually verify" for this type.
  ],
};

export function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}
