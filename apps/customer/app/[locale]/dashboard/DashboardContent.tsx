'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Car,
  FileText,
  CreditCard,
  Calendar,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface BookingVehicle {
  brand: string;
  model: string;
  year: number;
}

interface Booking {
  id: string;
  reference: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  grandTotalAed: number;
  depositAmountAed: number;
  depositPaid: boolean;
  vehicle: BookingVehicle;
  createdAt: string;
}

interface Payment {
  id: string;
  type: string;
  amountAed: number;
  totalAed: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
}

interface LeaseVehicle {
  brand: string;
  model: string;
  year: number;
  plateNumber: string | null;
}

interface Lease {
  id: string;
  reference: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRateAed: number;
  vatRate: number;
  vehicle: LeaseVehicle;
  payments: Payment[];
}

interface Document {
  id: string;
  type: string;
  fileUrl: string;
  status: string;
  expiryDate: string | null;
  uploadedAt: string;
  rejectionReason: string | null;
}

type Tab = 'bookings' | 'leases' | 'documents';

// ── Status badge helper ──────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    APPROVED: 'bg-green-50 text-green-700',
    ACTIVE: 'bg-green-50 text-green-700',
    PAID: 'bg-green-50 text-green-700',
    COMPLETED: 'bg-blue-50 text-blue-700',
    CONVERTED: 'bg-blue-50 text-blue-700',
    RENEWED: 'bg-blue-50 text-blue-700',
    SUBMITTED: 'bg-amber-50 text-amber-700',
    PENDING: 'bg-amber-50 text-amber-700',
    DRAFT: 'bg-neutral-100 text-neutral-600',
    REJECTED: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-red-50 text-red-700',
    OVERDUE: 'bg-red-50 text-red-700',
    EXPIRED: 'bg-red-50 text-red-700',
    TERMINATED_EARLY: 'bg-red-50 text-red-700',
  };
  const style = styles[status] ?? 'bg-neutral-100 text-neutral-600';

  const icons: Record<string, React.ReactNode> = {
    APPROVED: <CheckCircle2 size={12} />,
    ACTIVE: <CheckCircle2 size={12} />,
    PAID: <CheckCircle2 size={12} />,
    SUBMITTED: <Clock size={12} />,
    PENDING: <Clock size={12} />,
    REJECTED: <XCircle size={12} />,
    OVERDUE: <AlertCircle size={12} />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {icons[status]}
      {label}
    </span>
  );
}

// ── Format date helper ───────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB'); // DD/MM/YYYY (UAE standard)
  } catch {
    return iso;
  }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DashboardContent({ locale }: { locale: string }) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !customer) {
      router.replace(`/${locale}/login?redirect=/${locale}/dashboard`);
    }
  }, [authLoading, customer, locale, router]);

  // Fetch data
  useEffect(() => {
    if (!customer) return;

    setLoading(true);
    setError('');

    Promise.all([
      authFetch<Booking[]>('/bookings').catch(() => []),
      authFetch<Lease[]>('/leases').catch(() => []),
      authFetch<Document[]>('/customers/me/documents').catch(() => []),
    ])
      .then(([b, l, d]) => {
        setBookings(b);
        setLeases(l);
        setDocuments(d);
      })
      .catch(() => setError(t('loadError')))
      .finally(() => setLoading(false));
  }, [customer, t]);

  if (authLoading || !customer) {
    return (
      <section className="bg-neutral-50 pt-32 pb-20 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 text-center text-neutral-400 pt-20">
          <Loader2 className="animate-spin mx-auto mb-3" size={24} />
          {t('loading')}
        </div>
      </section>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'bookings', label: t('tabBookings'), count: bookings.length },
    { key: 'leases', label: t('tabLeases'), count: leases.length },
    { key: 'documents', label: t('tabDocuments'), count: documents.length },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-neutral-300">{t('subtitle')}</p>

          {/* KYC status */}
          {customer.kycStatus && (
            <div className="mt-4">
              <span className="text-neutral-400 text-sm me-2">{t('kycStatus')}:</span>
              <StatusBadge
                status={customer.kycStatus}
                label={t(`statusLabel.${customer.kycStatus}` as never) ?? customer.kycStatus}
              />
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-white border-b border-neutral-100 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {tabs.map((t_) => (
              <button
                key={t_.key}
                onClick={() => setTab(t_.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t_.key
                    ? 'border-brand text-brand'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {t_.label}
                {t_.count > 0 && (
                  <span className="ms-1.5 bg-neutral-100 text-neutral-600 text-xs px-1.5 py-0.5 rounded-full">
                    {t_.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 bg-neutral-50 min-h-[50vh]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-16 text-neutral-400">
              <Loader2 className="animate-spin mx-auto mb-3" size={24} />
              {t('loading')}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle className="mx-auto mb-3 text-red-400" size={24} />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : (
            <>
              {/* ── Bookings ── */}
              {tab === 'bookings' && (
                <div className="space-y-4">
                  {bookings.length === 0 ? (
                    <EmptyState
                      icon={<Car className="text-neutral-300" size={40} />}
                      message={t('noBookings')}
                      actionLabel={t('bookNow')}
                      actionHref={`/${locale}/booking`}
                    />
                  ) : (
                    bookings.map((b) => (
                      <div key={b.id} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Car size={16} className="text-brand" />
                              <span className="font-semibold text-neutral-900">
                                {b.vehicle.brand} {b.vehicle.model} {b.vehicle.year}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500">
                              {t('reference')}: {b.reference}
                            </p>
                          </div>
                          <StatusBadge
                            status={b.status}
                            label={t(`statusLabel.${b.status}` as never) ?? b.status}
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-neutral-500 text-xs">{t('startDate')}</span>
                            <p className="font-medium text-neutral-900">{fmtDate(b.startDate)}</p>
                          </div>
                          <div>
                            <span className="text-neutral-500 text-xs">{t('period')}</span>
                            <p className="font-medium text-neutral-900">{b.durationDays} {t('period')}</p>
                          </div>
                          <div>
                            <span className="text-neutral-500 text-xs">{t('totalDue')}</span>
                            <p className="font-medium text-neutral-900">AED {b.grandTotalAed?.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-neutral-500 text-xs">{t('deposit')}</span>
                            <p className="font-medium text-neutral-900">
                              AED {b.depositAmountAed?.toLocaleString()}
                              {b.depositPaid && (
                                <CheckCircle2 size={12} className="inline ms-1 text-green-600" />
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Leases ── */}
              {tab === 'leases' && (
                <div className="space-y-4">
                  {leases.length === 0 ? (
                    <EmptyState
                      icon={<FileText className="text-neutral-300" size={40} />}
                      message={t('noLeases')}
                      actionLabel={t('bookNow')}
                      actionHref={`/${locale}/booking`}
                    />
                  ) : (
                    leases.map((l) => {
                      const paidCount = l.payments.filter((p) => p.status === 'PAID').length;
                      const nextPayment = l.payments.find(
                        (p) => p.status === 'PENDING' || p.status === 'OVERDUE',
                      );

                      return (
                        <div key={l.id} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Car size={16} className="text-brand" />
                                <span className="font-semibold text-neutral-900">
                                  {l.vehicle.brand} {l.vehicle.model} {l.vehicle.year}
                                </span>
                                {l.vehicle.plateNumber && (
                                  <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                                    {l.vehicle.plateNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500">
                                {t('reference')}: {l.reference}
                              </p>
                            </div>
                            <StatusBadge
                              status={l.status}
                              label={t(`statusLabel.${l.status}` as never) ?? l.status}
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                            <div>
                              <span className="text-neutral-500 text-xs">{t('startDate')}</span>
                              <p className="font-medium text-neutral-900">{fmtDate(l.startDate)}</p>
                            </div>
                            <div>
                              <span className="text-neutral-500 text-xs">{t('endDate')}</span>
                              <p className="font-medium text-neutral-900">{fmtDate(l.endDate)}</p>
                            </div>
                            <div>
                              <span className="text-neutral-500 text-xs">{t('monthlyRate')}</span>
                              <p className="font-medium text-neutral-900">AED {l.monthlyRateAed?.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-neutral-500 text-xs">{t('payments')}</span>
                              <p className="font-medium text-neutral-900">
                                {t('paidPayments', { paid: paidCount, total: l.payments.length })}
                              </p>
                            </div>
                          </div>

                          {/* Next payment highlight */}
                          {nextPayment && (
                            <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                              nextPayment.status === 'OVERDUE'
                                ? 'bg-red-50 border border-red-100'
                                : 'bg-amber-50 border border-amber-100'
                            }`}>
                              <div className="flex items-center gap-2">
                                <CreditCard size={14} />
                                <span className="font-medium">{t('nextPayment')}:</span>
                                <span>{fmtDate(nextPayment.dueDate)}</span>
                              </div>
                              <span className="font-semibold">AED {nextPayment.totalAed?.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Documents ── */}
              {tab === 'documents' && (
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <EmptyState
                      icon={<FileText className="text-neutral-300" size={40} />}
                      message={t('noDocuments')}
                    />
                  ) : (
                    documents.map((d) => (
                      <div key={d.id} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-brand" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 text-sm">
                              {t(`docType.${d.type}` as never) ?? d.type}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {t('uploaded')}: {fmtDate(d.uploadedAt)}
                              {d.expiryDate && (
                                <> &middot; {t('expiry')}: {fmtDate(d.expiryDate)}</>
                              )}
                            </p>
                            {d.rejectionReason && (
                              <p className="text-xs text-red-600 mt-0.5">{d.rejectionReason}</p>
                            )}
                          </div>
                        </div>
                        <StatusBadge
                          status={d.status}
                          label={t(`statusLabel.${d.status}` as never) ?? d.status}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

// ── Empty state component ────────────────────────────────────────────────────

function EmptyState({
  icon,
  message,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto mb-4">{icon}</div>
      <p className="text-neutral-500 text-sm mb-4">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
        >
          {actionLabel} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}
