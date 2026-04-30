'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Clock, Search, Eye, FileText, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Pagination from '@/components/Pagination';
import { useData, Booking } from '@/lib/data-store';
import { api } from '@/lib/api';

export default function BookingsPage() {
  const { bookings, approveBooking, rejectBooking, refresh, loading: dataLoading } = useData();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' | 'create-lease' } | null>(null);
  const [leaseCreating, setLeaseCreating] = useState(false);
  const [leaseError, setLeaseError] = useState('');

  // #126 — client-side pagination over the filtered set.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const filtered = useMemo(
    () => bookings.filter(b => {
      const matchesFilter = filter === 'All' || b.status === filter.toUpperCase();
      const matchesSearch = `${b.ref} ${b.customer} ${b.vehicle}`.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    }),
    [bookings, filter, search],
  );

  useEffect(() => { setPage(1); }, [filter, search, limit]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * limit, page * limit),
    [filtered, page, limit],
  );

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading bookings...
      </div>
    );
  }

  const pending = bookings.filter(b => b.status === 'SUBMITTED').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-0.5">{pending} pending review</p>
        </div>
      </div>

      {leaseError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{leaseError}</span>
          <button onClick={() => setLeaseError('')} className="text-red-500 hover:text-red-700 text-xs font-medium">Dismiss</button>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search ref, customer, or vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-brand" />
        </div>
        <div className="flex gap-2">
          {['All', 'Submitted', 'Approved', 'Rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${filter === f ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 font-medium">
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Dates</th>
                <th className="px-5 py-3">Total (AED)</th>
                <th className="px-5 py-3">KYC</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{b.ref}</td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900">{b.customer}</div>
                    <div className="text-xs text-gray-400">{b.phone}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{b.vehicle}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    <div>{b.start}</div>
                    <div className="text-gray-400">to {b.end}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{b.totalAed.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Deposit: {b.depositAed.toLocaleString()}</div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={b.kycStatus} /></td>
                  <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      <button onClick={() => setViewBooking(b)} className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors" title="View details">
                        <Eye size={14} />
                      </button>
                      {b.status === 'SUBMITTED' && (
                        <>
                          <button
                            onClick={() => setConfirmAction({ id: b.id, action: 'approve' })}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: b.id, action: 'reject' })}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                      {b.status === 'APPROVED' && (
                        <button
                          onClick={() => setConfirmAction({ id: b.id, action: 'create-lease' })}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-light text-brand border border-brand/20 rounded-lg text-xs font-medium hover:bg-brand/10 transition-colors"
                        >
                          <FileText size={12} /> Create Lease
                        </button>
                      )}
                      {b.status !== 'SUBMITTED' && b.status !== 'APPROVED' && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 px-2"><Clock size={12} /> {b.status.toLowerCase()}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No bookings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={filtered.length}
        onPageChange={setPage}
        onLimitChange={setLimit}
        className="mt-4"
      />

      {/* Booking Detail Modal */}
      <Modal open={!!viewBooking} onClose={() => setViewBooking(null)} title={`Booking ${viewBooking?.ref ?? ''}`}>
        {viewBooking && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-400 text-xs mb-1">Customer</div>
                <div className="font-semibold">{viewBooking.customer}</div>
                <div className="text-gray-500">{viewBooking.phone}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Vehicle</div>
                <div className="font-semibold">{viewBooking.vehicle}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Rental Period</div>
                <div>{viewBooking.start} to {viewBooking.end}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Total / Deposit</div>
                <div className="font-semibold">AED {viewBooking.totalAed.toLocaleString()}</div>
                <div className="text-gray-500">Deposit: AED {viewBooking.depositAed.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">KYC Status</div>
                <StatusBadge status={viewBooking.kycStatus} />
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Booking Status</div>
                <StatusBadge status={viewBooking.status} />
              </div>
            </div>
            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
              VAT (5%): AED {(viewBooking.totalAed * 0.05).toLocaleString()} &middot; Total incl. VAT: AED {(viewBooking.totalAed * 1.05).toLocaleString()}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve/Reject/Create-Lease Confirm */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (confirmAction?.action === 'approve') approveBooking(confirmAction.id);
          if (confirmAction?.action === 'reject') rejectBooking(confirmAction.id);
          if (confirmAction?.action === 'create-lease') {
            setLeaseCreating(true);
            setLeaseError('');
            try {
              await api.post(`/admin/bookings/${confirmAction.id}/create-lease`);
              refresh();
            } catch (err) {
              setLeaseError(err instanceof Error ? err.message : 'Failed to create lease');
            } finally {
              setLeaseCreating(false);
            }
          }
        }}
        title={
          confirmAction?.action === 'approve' ? 'Approve Booking' :
          confirmAction?.action === 'create-lease' ? 'Create Lease' :
          'Reject Booking'
        }
        message={
          confirmAction?.action === 'approve'
            ? 'This will approve the booking and notify the customer. Proceed?'
            : confirmAction?.action === 'create-lease'
            ? 'This will create an active lease with a payment schedule and mark the vehicle as leased. Proceed?'
            : 'This will reject the booking. The customer will be notified. Proceed?'
        }
        confirmLabel={
          confirmAction?.action === 'approve' ? 'Approve' :
          confirmAction?.action === 'create-lease' ? (leaseCreating ? 'Creating...' : 'Create Lease') :
          'Reject'
        }
        danger={confirmAction?.action === 'reject'}
      />
    </div>
  );
}
