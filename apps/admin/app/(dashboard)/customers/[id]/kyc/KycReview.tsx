'use client';

/**
 * KYC review — interactive client component.
 *
 * Fetches AdminCustomerDetail (profile + documents), renders one
 * DocumentCard per KYC document, lets the admin approve / reject / re-OCR
 * each one with optional per-field overrides.
 *
 * State model:
 *   - `customer`: the fetched profile + docs (refreshed after each action)
 *   - `overrides[docId]`: per-field corrections the admin typed in this session
 *   - `actionState[docId]`: 'idle' | 'submitting' | 'success' | string (error)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

import StatusBadge from '@/components/StatusBadge';
import ConfidenceBadge, {
  GREEN_THRESHOLD,
  RED_THRESHOLD,
  tierForConfidence,
} from '@/components/ConfidenceBadge';
import {
  AdminCustomerDetail,
  AdminDocument,
  DocumentType,
  FIELD_SCHEMA,
  getOcrField,
  isPdfUrl,
  kycApi,
} from '@/lib/api-kyc';

// ── Constants ─────────────────────────────────────────────────────

const DOC_LABEL: Record<DocumentType, string> = {
  EMIRATES_ID: 'Emirates ID',
  DRIVING_LICENCE: 'Driving Licence',
  VISA: 'Visa Copy',
  PASSPORT: 'Passport Copy',
};

const POLL_MS = 4000;

// ── Component ─────────────────────────────────────────────────────

interface Props {
  customerId: string;
}

export default function KycReview({ customerId }: Props) {
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-document local state.
  // overrides[docId][fieldKey] = adminCorrectedValue
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, string>>
  >({});
  // actionState[docId] = 'idle' | 'approving' | 'rejecting' | 'reocring' | error message
  const [actionState, setActionState] = useState<Record<string, string>>({});
  // rejectReason[docId] = reason (only present when admin opens the reject form)
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    try {
      const data = await kycApi.getCustomer(customerId);
      setCustomer(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // Initial load.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while any document is PROCESSING — OCR finishes async on the backend.
  useEffect(() => {
    if (!customer) return;
    const anyProcessing = customer.documents.some(
      (d) => d.ocrStatus === 'PROCESSING',
    );
    if (!anyProcessing) return;
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [customer, refresh]);

  // ── Actions ───────────────────────────────────────────────────

  const handleApprove = async (doc: AdminDocument) => {
    setActionState((s) => ({ ...s, [doc.id]: 'approving' }));
    try {
      const docOverrides = overrides[doc.id] ?? {};
      await kycApi.approve(doc.id, docOverrides);
      setOverrides((s) => ({ ...s, [doc.id]: {} }));
      await refresh();
      setActionState((s) => ({ ...s, [doc.id]: 'idle' }));
    } catch (e) {
      setActionState((s) => ({
        ...s,
        [doc.id]: e instanceof Error ? e.message : 'Failed to approve',
      }));
    }
  };

  const handleReject = async (doc: AdminDocument) => {
    const reason = (rejectReason[doc.id] ?? '').trim();
    if (!reason) {
      setActionState((s) => ({ ...s, [doc.id]: 'A reason is required' }));
      return;
    }
    setActionState((s) => ({ ...s, [doc.id]: 'rejecting' }));
    try {
      await kycApi.reject(doc.id, reason);
      setRejectOpen((s) => ({ ...s, [doc.id]: false }));
      setRejectReason((s) => ({ ...s, [doc.id]: '' }));
      await refresh();
      setActionState((s) => ({ ...s, [doc.id]: 'idle' }));
    } catch (e) {
      setActionState((s) => ({
        ...s,
        [doc.id]: e instanceof Error ? e.message : 'Failed to reject',
      }));
    }
  };

  const handleReocr = async (doc: AdminDocument) => {
    setActionState((s) => ({ ...s, [doc.id]: 'reocring' }));
    try {
      await kycApi.reocr(doc.id);
      await refresh();
      setActionState((s) => ({ ...s, [doc.id]: 'idle' }));
    } catch (e) {
      setActionState((s) => ({
        ...s,
        [doc.id]: e instanceof Error ? e.message : 'Failed to re-trigger OCR',
      }));
    }
  };

  const setOverrideField = (docId: string, key: string, value: string) => {
    setOverrides((s) => ({
      ...s,
      [docId]: { ...(s[docId] ?? {}), [key]: value },
    }));
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 className="animate-spin" size={18} />
        Loading customer…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Could not load customer: {error}
      </div>
    );
  }

  if (!customer) return null;

  const sortedDocs = [...customer.documents].sort((a, b) => {
    // PENDING first, then by uploadedAt desc
    if (a.status !== b.status) {
      if (a.status === 'PENDING') return -1;
      if (b.status === 'PENDING') return 1;
    }
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/customers"
            className="mb-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={12} /> Customers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            KYC Review — {customer.fullName}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {customer.phone} · {customer.email ?? '—'} ·{' '}
            <span className="ms-1 inline-flex">
              <StatusBadge status={customer.kycStatus} />
            </span>
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Documents */}
      {sortedDocs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          This customer hasn&apos;t uploaded any KYC documents yet.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              customer={customer}
              doc={doc}
              overrides={overrides[doc.id] ?? {}}
              onOverride={(k, v) => setOverrideField(doc.id, k, v)}
              actionState={actionState[doc.id] ?? 'idle'}
              rejectOpen={!!rejectOpen[doc.id]}
              onToggleReject={() =>
                setRejectOpen((s) => ({ ...s, [doc.id]: !s[doc.id] }))
              }
              rejectReason={rejectReason[doc.id] ?? ''}
              onRejectReasonChange={(v) =>
                setRejectReason((s) => ({ ...s, [doc.id]: v }))
              }
              onApprove={() => void handleApprove(doc)}
              onReject={() => void handleReject(doc)}
              onReocr={() => void handleReocr(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── DocumentCard ───────────────────────────────────────────────────

interface CardProps {
  customer: AdminCustomerDetail;
  doc: AdminDocument;
  overrides: Record<string, string>;
  onOverride: (key: string, value: string) => void;
  actionState: string;
  rejectOpen: boolean;
  onToggleReject: () => void;
  rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onReocr: () => void;
}

function DocumentCard({
  customer,
  doc,
  overrides,
  onOverride,
  actionState,
  rejectOpen,
  onToggleReject,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
  onReocr,
}: CardProps) {
  const fields = FIELD_SCHEMA[doc.type] ?? [];
  const isProcessing = doc.ocrStatus === 'PROCESSING';
  const ocrFailed = doc.ocrStatus === 'FAILED';
  const decided = doc.status === 'APPROVED' || doc.status === 'REJECTED';
  const submitting =
    actionState === 'approving' ||
    actionState === 'rejecting' ||
    actionState === 'reocring';
  const errorMessage = !submitting && actionState !== 'idle' ? actionState : null;

  // Customer-entered "ground truth" map for the comparison column.
  // For Emirates ID + passport we reconstruct first/last from Customer.fullName.
  // For driving licence we use fullName as-is.
  const customerValueFor = (key: string): string | null => {
    const [firstName, ...rest] = customer.fullName.split(' ');
    const lastName = rest.join(' ');
    switch (key) {
      case 'firstName':
        return firstName ?? null;
      case 'lastName':
        return lastName || null;
      case 'fullName':
        return customer.fullName || null;
      case 'nationality':
        return customer.nationality;
      case 'dateOfExpiration':
      case 'expiryDate':
        return doc.expiryDate ? doc.expiryDate.slice(0, 10) : null;
      default:
        return null;
    }
  };

  // All-green check: every field has confidence ≥ green AND matches customer.
  const allGreen = fields.length > 0 && fields.every((f) => {
    const ocr = getOcrField(doc.ocrFields, f.key);
    const cust = customerValueFor(f.key);
    if (ocr.value == null || ocr.confidence == null) return false;
    if (ocr.confidence < GREEN_THRESHOLD) return false;
    // Comparison is loose — if no customer value, count as green (admin already trusts the doc).
    if (cust == null) return true;
    return normaliseValue(ocr.value) === normaliseValue(cust);
  });

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-3 bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">{DOC_LABEL[doc.type]}</h2>
          <StatusBadge status={doc.status} />
          {isProcessing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              <Loader2 className="animate-spin" size={10} />
              OCR running…
            </span>
          )}
          {doc.ocrStatus === 'COMPLETED' && (
            <ConfidenceBadge confidence={doc.ocrConfidence} />
          )}
          {ocrFailed && (
            <span
              title={doc.ocrFailureReason ?? 'OCR failed'}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700"
            >
              <AlertTriangle size={10} /> OCR failed
            </span>
          )}
          {doc.ocrStatus === 'SKIPPED' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              OCR skipped
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!decided && doc.type !== 'VISA' && (
            <button
              onClick={onReocr}
              disabled={submitting || isProcessing}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              title="Re-run Azure Document Intelligence on this image"
            >
              <RefreshCw size={12} /> Re-OCR
            </button>
          )}
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            <ExternalLink size={12} /> Open
          </a>
        </div>
      </header>

      {/* Body — three columns */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[280px,1fr,1fr]">
        {/* Image preview */}
        <div className="border-b border-gray-100 lg:border-b-0 lg:border-e p-4 bg-gray-50">
          <ImagePreview fileUrl={doc.fileUrl} />
          <div className="mt-2 text-[10px] text-gray-400">
            Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
          </div>
        </div>

        {/* OCR-extracted */}
        <div className="border-b border-gray-100 lg:border-b-0 lg:border-e p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            OCR Extracted
          </h3>
          {doc.type === 'VISA' ? (
            <p className="text-sm text-gray-500 italic">
              Visa documents are not auto-extracted in V1. Open the image and verify
              manually before approving.
            </p>
          ) : isProcessing ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="animate-spin" size={14} /> Reading document…
            </div>
          ) : ocrFailed ? (
            <p className="text-sm text-red-600">
              {doc.ocrFailureReason ?? 'OCR failed.'} You can still approve manually
              if the image is legible.
            </p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-gray-500">No fields configured for this type.</p>
          ) : (
            <dl className="space-y-2">
              {fields.map((f) => {
                const ocr = getOcrField(doc.ocrFields, f.key);
                return (
                  <div key={f.key} className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-500">{f.label}</dt>
                    <dd className="flex items-center gap-2 text-sm text-gray-800">
                      {ocr.value == null ? (
                        <span className="text-gray-400 italic">—</span>
                      ) : (
                        <>
                          <span className="font-medium tabular-nums">{ocr.value}</span>
                          <ConfidenceBadge confidence={ocr.confidence} showPercent={false} />
                        </>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>

        {/* Customer-entered + override */}
        <div className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Customer / Override
          </h3>
          {doc.type === 'VISA' || fields.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Verify against the source document; nothing structured to compare in V1.
            </p>
          ) : (
            <dl className="space-y-2">
              {fields.map((f) => {
                const ocr = getOcrField(doc.ocrFields, f.key);
                const cust = customerValueFor(f.key);
                const overrideVal = overrides[f.key];
                const tier = tierForConfidence(ocr.confidence);
                const mismatch =
                  ocr.value != null &&
                  cust != null &&
                  normaliseValue(ocr.value) !== normaliseValue(cust);
                const rowState =
                  ocr.value == null
                    ? 'unknown'
                    : tier === 'red'
                    ? 'red'
                    : mismatch
                    ? 'amber'
                    : tier === 'amber'
                    ? 'amber'
                    : 'green';
                return (
                  <div key={f.key} className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-500">{f.label}</dt>
                    <dd className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={cust ?? ocr.value ?? '—'}
                        value={overrideVal ?? cust ?? ''}
                        onChange={(e) => onOverride(f.key, e.target.value)}
                        disabled={decided}
                        className="w-44 rounded-md border border-gray-200 px-2 py-1 text-sm tabular-nums focus:border-brand focus:outline-none disabled:opacity-50"
                      />
                      <RowDot tier={rowState} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          {/* Action buttons */}
          {!decided && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <button
                onClick={onApprove}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                title={allGreen ? 'All fields match — one-click approve' : 'Approve with current values'}
              >
                <Check size={14} />
                {actionState === 'approving' ? 'Approving…' : 'Approve'}
              </button>
              <button
                onClick={onToggleReject}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                <X size={14} /> Reject…
              </button>
              {Object.keys(overrides).length > 0 && (
                <span className="text-[10px] text-amber-700">
                  {Object.keys(overrides).length} field(s) overridden
                </span>
              )}
              {errorMessage && (
                <span className="text-xs text-red-600">{errorMessage}</span>
              )}
            </div>
          )}

          {/* Reject form (inline) */}
          {!decided && rejectOpen && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <label className="mb-1 block text-xs font-medium text-red-900">
                Reason (visible to the customer)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => onRejectReasonChange(e.target.value)}
                placeholder="e.g. Image is too blurry to read the EID number — please re-upload a clearer photo"
                rows={2}
                className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-sm focus:border-red-400 focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={onToggleReject}
                  className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onReject}
                  disabled={submitting || rejectReason.trim().length === 0}
                  className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionState === 'rejecting' ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}

          {/* Decided — review summary */}
          {decided && (
            <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
              Reviewed{' '}
              {doc.reviewedAt ? new Date(doc.reviewedAt).toLocaleString() : '—'}
              {doc.reviewerOverrides &&
                Object.keys(doc.reviewerOverrides).length > 0 && (
                  <> · {Object.keys(doc.reviewerOverrides).length} override(s) recorded</>
                )}
              {doc.status === 'REJECTED' && doc.rejectionReason && (
                <div className="mt-1 text-red-600">
                  Reason: {doc.rejectionReason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── ImagePreview ────────────────────────────────────────────────────

function ImagePreview({ fileUrl }: { fileUrl: string }) {
  const [errored, setErrored] = useState(false);
  if (isPdfUrl(fileUrl) || errored) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-xs text-gray-500 hover:bg-gray-50"
      >
        <span className="flex items-center gap-1">
          <ExternalLink size={12} /> Open document
        </span>
      </a>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fileUrl}
      alt="KYC document"
      onError={() => setErrored(true)}
      className="aspect-[3/4] w-full rounded-lg object-cover bg-white ring-1 ring-gray-200"
    />
  );
}

// ── RowDot — tiny status indicator for the customer/override column ───

function RowDot({ tier }: { tier: 'green' | 'amber' | 'red' | 'unknown' }) {
  const cls =
    tier === 'green'
      ? 'bg-green-500'
      : tier === 'amber'
      ? 'bg-amber-500'
      : tier === 'red'
      ? 'bg-red-500'
      : 'bg-gray-300';
  return <span className={`h-2 w-2 rounded-full ${cls}`} aria-hidden />;
}

// ── Helpers ──────────────────────────────────────────────────────────

function normaliseValue(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[-/.,]/g, '')
    .trim();
}
