'use client';

import { useState } from 'react';
import { AlertTriangle, Search, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useData } from '@/lib/data-store';

export default function LeasesPage() {
  const { leases, markPayment, updateLease, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [paymentAction, setPaymentAction] = useState<{ leaseId: string; action: 'PAID' | 'OVERDUE' } | null>(null);
  const [terminateId, setTerminateId] = useState<string | null>(null);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading leases...
      </div>
    );
  }

  const filtered = leases.filter(l => {
    const matchesSearch = `${l.ref} ${l.customer} ${l.vehicle} ${l.plate}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || l.status === filter;
    return matchesSearch && matchesFilter;
  });

  const overdueLeases = leases.filter(l => l.nextPayment?.status === 'OVERDUE');
  const endingSoon = leases.filter(l => l.status === 'ACTIVE' && l.daysLeft <= 30);
  const activeCount = leases.filter(l => l.status === 'ACTIVE').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
        <p className="text-gray-500 mt-0.5">{activeCount} active leases</p>
      </div>

      {/* Alerts */}
      {(overdueLeases.length > 0 || endingSoon.length > 0) && (
        <div className="space-y-2 mb-4">
          {overdueLeases.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={15} className="shrink-0" />
              <span><strong>{overdueLeases.length} overdue payment(s):</strong> {overdueLeases.map(l => l.customer).join(', ')}</span>
            </div>
          )}
          {endingSoon.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              <AlertTriangle size={15} className="shrink-0" />
              <span><strong>{endingSoon.length} lease(s) ending within 30 days</strong> — consider sending renewal offers.</span>
            </div>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search ref, customer, vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-brand" />
        </div>
        <div className="flex gap-2">
          {['ALL', 'ACTIVE', 'COMPLETED', 'TERMINATED'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${filter === s ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'}`}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
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
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Days Left</th>
                <th className="px-5 py-3">Monthly (AED)</th>
                <th className="px-5 py-3">Next Payment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{l.ref}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900">{l.customer}</td>
                  <td className="px-5 py-4">
                    <div className="text-gray-800">{l.vehicle}</div>
                    <div className="text-xs font-mono text-gray-400">{l.plate}</div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    <div>{l.start}</div>
                    <div className="text-gray-400">to {l.end}</div>
                  </td>
                  <td className="px-5 py-4">
                    {l.status === 'ACTIVE' ? (
                      <span className={`font-semibold ${l.daysLeft <= 30 ? 'text-red-600' : 'text-gray-700'}`}>{l.daysLeft}d</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-4 font-semibold">{l.monthlyAed.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    {l.nextPayment ? (
                      <div>
                        <div className={`font-semibold text-xs ${l.nextPayment.status === 'OVERDUE' ? 'text-red-600' : l.nextPayment.status === 'PAID' ? 'text-green-600' : 'text-gray-700'}`}>
                          AED {l.nextPayment.amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{l.nextPayment.due}</div>
                        <StatusBadge status={l.nextPayment.status} />
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5 justify-end">
                      {l.status === 'ACTIVE' && l.nextPayment && l.nextPayment.status !== 'PAID' && (
                        <button
                          onClick={() => setPaymentAction({ leaseId: l.id, action: 'PAID' })}
                          className="flex items-center gap-1 px-2 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                          title="Mark as paid"
                        >
                          <DollarSign size={12} /> Paid
                        </button>
                      )}
                      {l.status === 'ACTIVE' && (
                        <button
                          onClick={() => setTerminateId(l.id)}
                          className="px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors"
                        >
                          Terminate
                        </button>
                      )}
                      {l.nextPayment?.status === 'PAID' && (
                        <span className="flex items-center gap-1 text-xs text-green-600 px-2"><CheckCircle size={12} /> Paid</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400">No leases found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark payment confirm */}
      <ConfirmDialog
        open={!!paymentAction}
        onClose={() => setPaymentAction(null)}
        onConfirm={() => paymentAction && markPayment(paymentAction.leaseId, paymentAction.action)}
        title="Confirm Payment"
        message="Mark this payment as received? This will update the lease payment status."
        confirmLabel="Confirm Payment"
      />

      {/* Terminate confirm */}
      <ConfirmDialog
        open={!!terminateId}
        onClose={() => setTerminateId(null)}
        onConfirm={() => terminateId && updateLease(terminateId, { status: 'TERMINATED', nextPayment: null })}
        title="Terminate Lease"
        message="Are you sure you want to terminate this lease early? This action cannot be undone."
        confirmLabel="Terminate"
        danger
      />
    </div>
  );
}
