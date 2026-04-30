'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, FileCheck, FileX, Clock, Plus, Pencil, Trash2, CheckCircle, ScanLine, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Pagination from '@/components/Pagination';
import { useData, Customer } from '@/lib/data-store';

const docLabels = ['emirates_id', 'driving_licence', 'visa', 'passport'] as const;
const docShort: Record<string, string> = { emirates_id: 'EID', driving_licence: 'DL', visa: 'Visa', passport: 'PP' };
const docIcons: Record<string, React.ReactNode> = {
  APPROVED: <FileCheck size={14} className="text-green-600" />,
  REJECTED: <FileX size={14} className="text-red-500" />,
  PENDING:  <Clock size={14} className="text-amber-500" />,
};

const emptyForm = (): Omit<Customer, 'id'> => ({
  name: '', phone: '+971 5', email: '', nationality: '', kycStatus: 'PENDING',
  activeLeases: 0, joinedDate: new Date().toLocaleDateString('en-GB'),
  docs: { emirates_id: 'PENDING', driving_licence: 'PENDING', visa: 'PENDING', passport: 'PENDING' },
});

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Customer, 'id'>>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // #126 — client-side pagination over the filtered set.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const filtered = useMemo(
    () => customers.filter(c =>
      `${c.name} ${c.email} ${c.phone} ${c.nationality}`.toLowerCase().includes(search.toLowerCase())
    ),
    [customers, search],
  );

  useEffect(() => { setPage(1); }, [search, limit]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * limit, page * limit),
    [filtered, page, limit],
  );

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading customers...
      </div>
    );
  }

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    const { id, ...rest } = c;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateCustomer(editingId, form);
    } else {
      addCustomer(form);
    }
    setModalOpen(false);
  };

  const handleApproveKyc = (c: Customer) => {
    updateCustomer(c.id, {
      kycStatus: 'APPROVED',
      docs: { emirates_id: 'APPROVED', driving_licence: 'APPROVED', visa: 'APPROVED', passport: 'APPROVED' },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-0.5">{customers.length} registered customers</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="w-full max-w-sm pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-brand" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 font-medium">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Nationality</th>
                <th className="px-5 py-3">KYC Status</th>
                <th className="px-5 py-3">Documents</th>
                <th className="px-5 py-3">Active Leases</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <button onClick={() => setDetailCustomer(c)} className="text-left hover:text-brand transition-colors">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.email}</div>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{c.nationality}</td>
                  <td className="px-5 py-4"><StatusBadge status={c.kycStatus} /></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {docLabels.map(doc => (
                        <div key={doc} className="flex flex-col items-center gap-0.5" title={`${docShort[doc]}: ${c.docs[doc]}`}>
                          {docIcons[c.docs[doc]]}
                          <span className="text-[9px] text-gray-400">{docShort[doc]}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`font-semibold ${c.activeLeases > 0 ? 'text-brand' : 'text-gray-400'}`}>{c.activeLeases}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs">{c.joinedDate}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5 justify-end">
                      <Link
                        href={`/customers/${c.id}/kyc`}
                        className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        title="Review KYC documents (with OCR)"
                      >
                        <ScanLine size={12} /> Review KYC
                      </Link>
                      {c.kycStatus === 'SUBMITTED' && (
                        <button onClick={() => handleApproveKyc(c)} className="flex items-center gap-1 px-2 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors" title="Approve KYC (whole customer)">
                          <CheckCircle size={12} /> Approve
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No customers found.</td></tr>
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

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input type="text" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} placeholder="e.g. UAE, CN, UK" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KYC Status</label>
              <select value={form.kycStatus} onChange={e => setForm({...form, kycStatus: e.target.value as Customer['kycStatus']})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand">
                {['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
              <div className="grid grid-cols-2 gap-3">
                {docLabels.map(doc => (
                  <div key={doc} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{docShort[doc]}</span>
                    <select
                      value={form.docs[doc]}
                      onChange={e => setForm({...form, docs: {...form.docs, [doc]: e.target.value as any}})}
                      className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-brand"
                    >
                      {['PENDING', 'APPROVED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.name || !form.email} className="px-5 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50">
            {editingId ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal open={!!detailCustomer} onClose={() => setDetailCustomer(null)} title={detailCustomer?.name ?? 'Customer'}>
        {detailCustomer && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-gray-400 text-xs mb-1">Email</div><div>{detailCustomer.email}</div></div>
              <div><div className="text-gray-400 text-xs mb-1">Phone</div><div>{detailCustomer.phone}</div></div>
              <div><div className="text-gray-400 text-xs mb-1">Nationality</div><div>{detailCustomer.nationality}</div></div>
              <div><div className="text-gray-400 text-xs mb-1">Joined</div><div>{detailCustomer.joinedDate}</div></div>
              <div><div className="text-gray-400 text-xs mb-1">KYC Status</div><StatusBadge status={detailCustomer.kycStatus} /></div>
              <div><div className="text-gray-400 text-xs mb-1">Active Leases</div><div className="font-semibold">{detailCustomer.activeLeases}</div></div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-2">KYC Documents</div>
              <div className="grid grid-cols-2 gap-2">
                {docLabels.map(doc => (
                  <div key={doc} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-700">{docShort[doc]}</span>
                    <StatusBadge status={detailCustomer.docs[doc]} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteCustomer(deleteTarget.id)}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
