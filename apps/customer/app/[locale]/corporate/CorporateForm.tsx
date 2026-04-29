'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2, Car, CreditCard, FileText, Send, CheckCircle2,
  MessageCircle, Plus, Clock, Loader2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { authFetch } from '@/lib/auth';
import { WHATSAPP_NUMBER } from '@/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────

interface LeaseVehicle { brand: string; model: string; year: number; plateNumber: string | null; }
interface Payment { id: string; totalAed: number; dueDate: string; paidAt: string | null; status: string; }
interface Lease {
  id: string; reference: string; status: string; startDate: string; endDate: string;
  monthlyRateAed: number; vehicle: LeaseVehicle; payments: Payment[];
}

interface FleetRequest {
  id: string; date: string; fleetSize: string; duration: string;
  brands: string[]; status: string; notes: string;
}

type Tab = 'fleet' | 'request' | 'payments' | 'company';

const FLEET_SIZES = ['1-5', '6-10', '11-20', '21-50', '50+'];
const DURATIONS = ['3', '6', '12', '24', '36'];
const BRANDS = ['NIO', 'Voyah', 'Zeekr', 'BYD'];

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-GB'); } catch { return iso; }
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700', APPROVED: 'bg-green-50 text-green-700',
    DELIVERED: 'bg-green-50 text-green-700', PAID: 'bg-green-50 text-green-700',
    PENDING: 'bg-amber-50 text-amber-700', IN_PROGRESS: 'bg-blue-50 text-blue-700',
    REJECTED: 'bg-red-50 text-red-700', OVERDUE: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] ?? 'bg-neutral-100 text-neutral-600'}`}>
      {label}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CorporateForm({ locale }: { locale: string }) {
  const t = useTranslations('corporate');
  const tAuth = useTranslations('auth');
  const tBooking = useTranslations('booking');
  const router = useRouter();
  const { customer, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>('fleet');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  // Request form state
  const [requests, setRequests] = useState<FleetRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [fleetSize, setFleetSize] = useState('');
  const [duration, setDuration] = useState('12');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Company profile state
  const [companyName, setCompanyName] = useState('');
  const [tradeLicence, setTradeLicence] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyMessage, setCompanyMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !customer) {
      router.replace(`/${locale}/login`);
    }
  }, [authLoading, customer, locale, router]);

  // Fetch leases data
  useEffect(() => {
    if (!customer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    authFetch<Lease[]>('/leases')
      .then(setLeases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customer]);

  // Populate company profile from customer data
  useEffect(() => {
    if (customer) {
      setContactPerson(customer.name ?? '');
      setCompanyEmail(customer.email ?? '');
    }
  }, [customer]);

  if (authLoading || !customer) {
    return (
      <section className="bg-neutral-50 pt-32 pb-20 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 text-center text-neutral-400 pt-20">
          <Loader2 className="animate-spin mx-auto mb-3" size={24} />
        </div>
      </section>
    );
  }

  // Computed fleet stats
  const activeLeases = leases.filter((l) => l.status === 'ACTIVE');
  const totalMonthly = activeLeases.reduce((sum, l) => sum + l.monthlyRateAed, 0);
  const allPayments = leases.flatMap((l) => l.payments);
  const outstandingPayments = allPayments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
  const totalOutstanding = outstandingPayments.reduce((sum, p) => sum + p.totalAed, 0);
  const nextPayment = outstandingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  };

  const handleSubmitRequest = async () => {
    if (!fleetSize) return;
    setSubmitting(true);
    // Simulated — backend doesn't have a corporate endpoint yet
    await new Promise((r) => setTimeout(r, 800));
    const newRequest: FleetRequest = {
      id: Date.now().toString(), date: new Date().toISOString(),
      fleetSize, duration, brands: selectedBrands, status: 'PENDING', notes,
    };
    setRequests((prev) => [newRequest, ...prev]);
    setSubmitSuccess(true);
    setSubmitting(false);
    setFleetSize(''); setDuration('12'); setSelectedBrands([]); setNotes('');
    setTimeout(() => { setSubmitSuccess(false); setShowRequestForm(false); }, 3000);
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    setCompanyMessage('');
    await new Promise((r) => setTimeout(r, 600));
    setCompanyMessage(t('companySaved'));
    setSavingCompany(false);
  };

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi, I'm from ${companyName || 'our company'} and interested in corporate fleet rental.`,
  )}`;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'fleet', label: t('tabFleet'), icon: <Car size={16} /> },
    { key: 'request', label: t('tabRequest'), icon: <Plus size={16} /> },
    { key: 'payments', label: t('tabPayments'), icon: <CreditCard size={16} /> },
    { key: 'company', label: t('tabCompany'), icon: <Building2 size={16} /> },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pt-32 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="text-gold" size={28} />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">{t('title')}</h1>
          </div>
          <p className="text-neutral-400">{t('subtitle')}</p>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{activeLeases.length}</div>
              <div className="text-xs text-neutral-400 mt-1">{t('activeVehicles')}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">AED {totalMonthly.toLocaleString()}</div>
              <div className="text-xs text-neutral-400 mt-1">{t('totalMonthly')}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{requests.filter((r) => r.status === 'PENDING').length}</div>
              <div className="text-xs text-neutral-400 mt-1">{t('pendingRequests')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-white border-b border-neutral-100 sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((t_) => (
              <button
                key={t_.key}
                onClick={() => setTab(t_.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t_.key
                    ? 'border-brand text-brand'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {t_.icon}
                {t_.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 bg-neutral-50 min-h-[50vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-16 text-neutral-400">
              <Loader2 className="animate-spin mx-auto mb-3" size={24} />
            </div>
          ) : (
            <>
              {/* ── Fleet Tab ── */}
              {tab === 'fleet' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-neutral-900">{t('fleetOverview')}</h2>
                    <button
                      onClick={() => setTab('request')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
                    >
                      <Plus size={14} /> {t('requestNew')}
                    </button>
                  </div>
                  {activeLeases.length === 0 ? (
                    <div className="text-center py-16">
                      <Car className="mx-auto mb-4 text-neutral-300" size={40} />
                      <p className="text-neutral-500 text-sm mb-4">{t('noFleet')}</p>
                      <button
                        onClick={() => setTab('request')}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
                      >
                        <Plus size={14} /> {t('requestNew')}
                      </button>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {activeLeases.map((l) => {
                        const paidCount = l.payments.filter((p) => p.status === 'PAID').length;
                        return (
                          <div key={l.id} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-semibold text-neutral-900">
                                  {l.vehicle.brand} {l.vehicle.model} {l.vehicle.year}
                                </div>
                                {l.vehicle.plateNumber && (
                                  <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded mt-1 inline-block">
                                    {l.vehicle.plateNumber}
                                  </span>
                                )}
                              </div>
                              <StatusBadge status={l.status} label={l.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-neutral-500 text-xs">{t('totalMonthly')}</span>
                                <p className="font-medium">AED {l.monthlyRateAed?.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-neutral-500 text-xs">{t('nextDue')}</span>
                                <p className="font-medium">{fmtDate(l.endDate)}</p>
                              </div>
                              <div>
                                <span className="text-neutral-500 text-xs">{t('tabPayments')}</span>
                                <p className="font-medium">{paidCount}/{l.payments.length}</p>
                              </div>
                              <div>
                                <span className="text-neutral-500 text-xs">#</span>
                                <p className="font-medium text-xs">{l.reference}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Request Vehicles Tab ── */}
              {tab === 'request' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900">{t('requestTitle')}</h2>
                      <p className="text-sm text-neutral-500 mt-1">{t('requestSubtitle')}</p>
                    </div>
                    {!showRequestForm && (
                      <button
                        onClick={() => setShowRequestForm(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
                      >
                        <Plus size={14} /> {t('newRequest')}
                      </button>
                    )}
                  </div>

                  {/* Request Form */}
                  {showRequestForm && (
                    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 mb-6 space-y-5">
                      {submitSuccess ? (
                        <div className="text-center py-6">
                          <CheckCircle2 className="mx-auto mb-3 text-green-600" size={40} />
                          <h3 className="text-lg font-bold text-neutral-900">{t('requestSubmitted')}</h3>
                          <p className="text-sm text-neutral-500 mt-1">{t('requestSubmittedDesc')}</p>
                        </div>
                      ) : (
                        <>
                          {/* Fleet Size */}
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('fleetSize')} *</label>
                            <div className="flex flex-wrap gap-2">
                              {FLEET_SIZES.map((s) => (
                                <button key={s} onClick={() => setFleetSize(s)}
                                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${fleetSize === s ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                                  {tAuth('vehicleCount', { count: s })}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Duration */}
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('fleetDuration')}</label>
                            <div className="flex flex-wrap gap-2">
                              {DURATIONS.map((d) => (
                                <button key={d} onClick={() => setDuration(d)}
                                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${duration === d ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                                  {d} {tBooking('months')}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Brands */}
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('fleetBrands')}</label>
                            <div className="flex flex-wrap gap-2">
                              {BRANDS.map((brand) => (
                                <button key={brand} onClick={() => toggleBrand(brand)}
                                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedBrands.includes(brand) ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                                  {brand}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('additionalNotes')}</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                              placeholder={tAuth('additionalNotesPlaceholder')} rows={3}
                              className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none" />
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3">
                            <button onClick={handleSubmitRequest} disabled={submitting || !fleetSize}
                              className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50">
                              <Send size={16} />
                              {submitting ? t('submittingRequest') : t('submitRequest')}
                            </button>
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#20bd5a] transition-colors">
                              <MessageCircle size={16} /> WhatsApp
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Request History */}
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">{t('requestHistory')}</h3>
                  {requests.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="mx-auto mb-3 text-neutral-300" size={32} />
                      <p className="text-neutral-500 text-sm">{t('noRequests')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {requests.map((r) => (
                        <div key={r.id} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-neutral-900 text-sm">
                              {tAuth('vehicleCount', { count: r.fleetSize })} · {r.duration} {tBooking('months')}
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              {r.brands.length > 0 ? r.brands.join(', ') : tAuth('selectBrands')} · {fmtDate(r.date)}
                            </div>
                          </div>
                          <StatusBadge status={r.status} label={t(`status.${r.status}` as never) ?? r.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Payments Tab ── */}
              {tab === 'payments' && (
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 mb-6">{t('paymentSummary')}</h2>

                  {/* Summary row */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
                      <div className="text-sm text-neutral-500">{t('totalOutstanding')}</div>
                      <div className="text-2xl font-bold text-neutral-900 mt-1">AED {totalOutstanding.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5">
                      <div className="text-sm text-neutral-500">{t('nextDue')}</div>
                      <div className="text-2xl font-bold text-neutral-900 mt-1">
                        {nextPayment ? fmtDate(nextPayment.dueDate) : '—'}
                      </div>
                    </div>
                  </div>

                  {allPayments.length === 0 ? (
                    <div className="text-center py-10">
                      <CreditCard className="mx-auto mb-3 text-neutral-300" size={32} />
                      <p className="text-neutral-500 text-sm">{t('noPayments')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allPayments
                        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                        .map((p) => {
                          const lease = leases.find((l) => l.payments.some((pay) => pay.id === p.id));
                          return (
                            <div key={p.id} className="bg-white rounded-lg border border-neutral-100 p-4 flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-neutral-900">
                                  AED {p.totalAed?.toLocaleString()}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {lease ? `${lease.vehicle.brand} ${lease.vehicle.model}` : ''} · {fmtDate(p.dueDate)}
                                  {p.paidAt && ` · ${fmtDate(p.paidAt)}`}
                                </div>
                              </div>
                              <StatusBadge status={p.status} label={p.status} />
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Company Profile Tab ── */}
              {tab === 'company' && (
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 mb-6">{t('companyDetails')}</h2>
                  <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('companyName')}</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                          placeholder={tAuth('companyNamePlaceholder')}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('tradeLicence')}</label>
                        <input type="text" value={tradeLicence} onChange={(e) => setTradeLicence(e.target.value)}
                          placeholder={tAuth('tradeLicencePlaceholder')}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('contactPerson')}</label>
                        <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                          placeholder={tAuth('contactPersonPlaceholder')}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('email')}</label>
                        <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder={tAuth('emailPlaceholder')} dir="ltr"
                          className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">{tAuth('phone')}</label>
                      <input type="tel" value={customer.phone} disabled dir="ltr"
                        className="w-full px-4 py-3 border border-neutral-100 rounded-lg text-sm bg-neutral-50 text-neutral-500" />
                    </div>

                    {companyMessage && (
                      <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{companyMessage}</p>
                    )}

                    <div className="flex gap-3">
                      <button onClick={handleSaveCompany} disabled={savingCompany}
                        className="px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50">
                        {savingCompany ? t('savingCompany') : t('saveCompany')}
                      </button>
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#25D366] text-white font-semibold rounded-lg hover:bg-[#20bd5a] transition-colors">
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
