'use client';

import { useState } from 'react';
import { Plus, AlertTriangle, Search, Pencil, Trash2, Wrench, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import VehicleImageManager from '@/components/VehicleImageManager';
import { useData, Vehicle } from '@/lib/data-store';

const BRANDS = [
  'DONGFENG', 'BESTUNE', 'HONGQI', 'FORTING', 'WEY', 'GREAT_WALL', 'ZEEKR',
  'BYD', 'HAVAL', 'GWM', 'CHERY', 'OMODA', 'GEELY', 'JAECOO', 'NIO', 'VOYAH',
];
const FUELS: Vehicle['fuel'][] = ['petrol', 'electric', 'hybrid', 'diesel'];
const STATUSES: Vehicle['status'][] = ['AVAILABLE', 'LEASED', 'MAINTENANCE', 'RETIRED'];

function daysUntil(dateStr: string) {
  if (!dateStr) return NaN;
  const parts = dateStr.split('/');
  const date = parts.length === 3
    ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    : new Date(dateStr);
  if (isNaN(date.getTime())) return NaN;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const emptyForm = (): Omit<Vehicle, 'id'> => ({
  brand: 'DONGFENG', model: '', year: 2025, plate: '', category: '', fuel: 'petrol',
  colour: '', seats: 5, monthlyAed: 0, dailyAed: 0, depositAed: 0, mileage: 0,
  status: 'AVAILABLE', insuranceExpiry: '', rtaExpiry: '', features: [],
  priceAed: 0, leaseMonthlyAed: 0,
});

export default function FleetPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle, loading: dataLoading } = useData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, 'id'>>(emptyForm());
  const [featuresText, setFeaturesText] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [statusAction, setStatusAction] = useState<{ id: string; brand: string; model: string; to: Vehicle['status'] } | null>(null);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading fleet...
      </div>
    );
  }

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFeaturesText('');
    setModalOpen(true);
  };

  const toInputDate = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ddmmyyyy;
  };

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    const { id, ...rest } = v;
    setForm({
      ...rest,
      insuranceExpiry: toInputDate(v.insuranceExpiry),
      rtaExpiry: toInputDate(v.rtaExpiry),
    });
    setFeaturesText(v.features.join(', '));
    setSaveError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    const data = { ...form, features: featuresText.split(',').map(f => f.trim()).filter(Boolean) };
    try {
      if (editingId) {
        await updateVehicle(editingId, data);
      } else {
        await addVehicle(data);
      }
      setModalOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  const filtered = vehicles.filter(v => {
    const matchesSearch = `${v.brand} ${v.model} ${v.plate}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const leased = vehicles.filter(v => v.status === 'LEASED').length;
  const maintenance = vehicles.filter(v => v.status === 'MAINTENANCE').length;
  const expiringInsurance = vehicles.filter(v => daysUntil(v.insuranceExpiry) <= 30 && daysUntil(v.insuranceExpiry) > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
          <p className="text-gray-500 mt-0.5">{vehicles.length} vehicles total</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { label: `${available} Available`, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: `${leased} Leased`, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: `${maintenance} In Maintenance`, color: 'bg-orange-50 text-orange-700 border-orange-200' },
        ].map(({ label, color }) => (
          <span key={label} className={`px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>{label}</span>
        ))}
      </div>

      {expiringInsurance.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{expiringInsurance.length} vehicle(s)</strong> have insurance expiring within 30 days: {expiringInsurance.map(v => v.plate).join(', ')}</span>
        </div>
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search brand, model, or plate..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-2">
          {['ALL', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                filterStatus === s ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'
              }`}
            >
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
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Plate</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Rate (AED/mo)</th>
                <th className="px-5 py-3">Deposit (AED)</th>
                <th className="px-5 py-3">Mileage Limit</th>
                <th className="px-5 py-3">Insurance Expiry</th>
                <th className="px-5 py-3">RTA Expiry</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => {
                const insDays = daysUntil(v.insuranceExpiry);
                const rtaDays = daysUntil(v.rtaExpiry);
                return (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900">{v.brand} {v.model}</div>
                      <div className="text-xs text-gray-400">{v.year} · {v.category}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">{v.plate}</td>
                    <td className="px-5 py-4"><StatusBadge status={v.status} /></td>
                    <td className="px-5 py-4 font-semibold">{v.monthlyAed.toLocaleString()}</td>
                    <td className="px-5 py-4 text-gray-600">{v.depositAed ? v.depositAed.toLocaleString() : '—'}</td>
                    <td className="px-5 py-4 text-gray-600">{v.mileage.toLocaleString()} km/mo</td>
                    <td className="px-5 py-4">
                      <span className={insDays <= 30 && insDays > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {v.insuranceExpiry} {insDays <= 30 && insDays > 0 && `(${insDays}d)`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={rtaDays <= 60 && rtaDays > 0 ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                        {v.rtaExpiry} {rtaDays <= 60 && rtaDays > 0 && `(${rtaDays}d)`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {v.status === 'AVAILABLE' && (
                          <button
                            onClick={() => setStatusAction({ id: v.id, brand: v.brand, model: v.model, to: 'MAINTENANCE' })}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                            title="Send to maintenance"
                          >
                            <Wrench size={12} /> Maintain
                          </button>
                        )}
                        {v.status === 'MAINTENANCE' && (
                          <button
                            onClick={() => setStatusAction({ id: v.id, brand: v.brand, model: v.model, to: 'AVAILABLE' })}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            title="Mark as available"
                          >
                            <CheckCircle size={12} /> Available
                          </button>
                        )}
                        {(v.status === 'AVAILABLE' || v.status === 'MAINTENANCE') && (
                          <button
                            onClick={() => setStatusAction({ id: v.id, brand: v.brand, model: v.model, to: 'RETIRED' })}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            title="Retire vehicle"
                          >
                            <XCircle size={12} /> Retire
                          </button>
                        )}
                        {v.status === 'RETIRED' && (
                          <button
                            onClick={() => setStatusAction({ id: v.id, brand: v.brand, model: v.model, to: 'AVAILABLE' })}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Reactivate vehicle"
                          >
                            <RotateCcw size={12} /> Reactivate
                          </button>
                        )}
                        <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(v)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400">No vehicles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Vehicle' : 'Add Vehicle'} wide>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand">
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input type="text" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="e.g. Shine E1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input type="number" value={form.year} onChange={e => setForm({...form, year: +e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
            <input type="text" value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} placeholder="e.g. A 12345" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Sedan, SUV, MPV" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
            <select value={form.fuel} onChange={e => setForm({...form, fuel: e.target.value as Vehicle['fuel']})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand">
              {FUELS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
            <input type="text" value={form.colour} onChange={e => setForm({...form, colour: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
            <input type="number" value={form.seats} onChange={e => setForm({...form, seats: +e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div className="col-span-2 mt-2 mb-1">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rental Pricing</h4>
          </div>
          <div className="hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (AED)</label>
            <input type="number" value={form.priceAed || ''} onChange={e => setForm({...form, priceAed: +e.target.value})} placeholder="e.g. 240000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rent — Monthly (AED)</label>
            <input type="number" value={form.monthlyAed || ''} onChange={e => setForm({...form, monthlyAed: +e.target.value})} placeholder="Short-term rental rate" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rent — Daily (AED)</label>
            <input type="number" value={form.dailyAed || ''} onChange={e => setForm({...form, dailyAed: +e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit (AED)</label>
            <input type="number" value={form.depositAed || ''} onChange={e => setForm({...form, depositAed: +e.target.value})} placeholder="e.g. 1500" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div className="hidden">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lease — Monthly (AED)</label>
            <input type="number" value={form.leaseMonthlyAed || ''} onChange={e => setForm({...form, leaseMonthlyAed: +e.target.value})} placeholder="36-month instalment" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mileage Limit (km/month)</label>
            <input type="number" value={form.mileage || ''} onChange={e => setForm({...form, mileage: +e.target.value})} placeholder="e.g. 9000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Vehicle['status']})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry</label>
            <input type="date" value={form.insuranceExpiry} onChange={e => setForm({...form, insuranceExpiry: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RTA Expiry</label>
            <input type="date" value={form.rtaExpiry} onChange={e => setForm({...form, rtaExpiry: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (comma separated)</label>
            <input type="text" value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder="e.g. Panoramic sunroof, Apple CarPlay, 420 km range" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
        </div>

        {editingId && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <VehicleImageManager vehicleId={editingId} />
          </div>
        )}

        {saveError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{saveError}</div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.model || !form.plate || saving}
            className="px-5 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Vehicle'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteVehicle(deleteTarget.id)}
        title="Delete Vehicle"
        message={`Are you sure you want to remove ${deleteTarget?.brand} ${deleteTarget?.model} (${deleteTarget?.plate}) from the fleet? This action cannot be undone.`}
        confirmLabel="Delete Vehicle"
        danger
      />

      <ConfirmDialog
        open={!!statusAction}
        onClose={() => setStatusAction(null)}
        onConfirm={() => {
          if (statusAction) {
            updateVehicle(statusAction.id, { status: statusAction.to });
            setStatusAction(null);
          }
        }}
        title={
          statusAction?.to === 'MAINTENANCE' ? 'Send to Maintenance' :
          statusAction?.to === 'RETIRED' ? 'Retire Vehicle' :
          statusAction?.to === 'AVAILABLE' ? 'Mark as Available' : 'Change Status'
        }
        message={
          statusAction?.to === 'MAINTENANCE'
            ? `Send ${statusAction.brand} ${statusAction.model} to maintenance? It will be removed from the available fleet until marked available again.`
          : statusAction?.to === 'RETIRED'
            ? `Retire ${statusAction?.brand} ${statusAction?.model}? It will be permanently removed from the active fleet. You can reactivate it later if needed.`
          : `Mark ${statusAction?.brand} ${statusAction?.model} as available? It will appear in the customer-facing fleet.`
        }
        confirmLabel={
          statusAction?.to === 'MAINTENANCE' ? 'Send to Maintenance' :
          statusAction?.to === 'RETIRED' ? 'Retire Vehicle' :
          'Mark Available'
        }
        danger={statusAction?.to === 'RETIRED'}
      />
    </div>
  );
}
