'use client';

import { useState, useEffect } from 'react';
import { Save, Building2, Globe, Shield, Bell } from 'lucide-react';

const SETTINGS_KEY = 'origin_admin_settings';

interface CompanySettings {
  name: string; email: string; phone: string; address: string;
  vatNumber: string; vatRate: number; currency: string;
}

interface NotificationSettings {
  emailOnBooking: boolean; whatsappOnBooking: boolean;
  insuranceReminder: boolean; insuranceReminderDays: number;
  rtaReminder: boolean; rtaReminderDays: number;
  paymentReminder: boolean; paymentReminderDays: number;
}

const defaultCompany: CompanySettings = {
  name: 'Origin',
  email: 'admin@originleasing.ae',
  phone: '+971 5X XXX XXXX',
  address: 'Creek Harbour, Horizon Tower 2, Unit 2502, Dubai',
  vatNumber: '',
  vatRate: 5,
  currency: 'AED',
};

const defaultNotifications: NotificationSettings = {
  emailOnBooking: true, whatsappOnBooking: true,
  insuranceReminder: true, insuranceReminderDays: 30,
  rtaReminder: true, rtaReminderDays: 60,
  paymentReminder: true, paymentReminderDays: 3,
};

function loadSettings(): { company: CompanySettings; notifications: NotificationSettings } {
  if (typeof window === 'undefined') return { company: defaultCompany, notifications: defaultNotifications };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { company: defaultCompany, notifications: defaultNotifications };
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [company, setCompany] = useState<CompanySettings>(defaultCompany);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);

  // Load persisted settings on mount
  useEffect(() => {
    const s = loadSettings();
    setCompany(s.company);
    setNotifications(s.notifications);
  }, []);

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ company, notifications }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-0.5">Manage your admin panel configuration</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
          <Save size={16} /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Company Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-brand-light rounded-lg flex items-center justify-center">
            <Building2 size={18} className="text-brand" />
          </div>
          <h2 className="font-semibold text-gray-900">Company Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" value={company.name} onChange={e => setCompany({...company, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
            <input type="email" value={company.email} onChange={e => setCompany({...company, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="text" value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number (TRN)</label>
            <input type="text" value={company.vatNumber} onChange={e => setCompany({...company, vatNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Address</label>
            <input type="text" value={company.address} onChange={e => setCompany({...company, address: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
            <input type="number" value={company.vatRate} onChange={e => setCompany({...company, vatRate: +e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={company.currency} onChange={e => setCompany({...company, currency: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand">
              <option value="AED">AED (UAE Dirham)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
            <Bell size={18} className="text-amber-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
        </div>
        <div className="space-y-4">
          {[
            { key: 'emailOnBooking', label: 'Email notification on new booking' },
            { key: 'whatsappOnBooking', label: 'WhatsApp notification on new booking' },
            { key: 'insuranceReminder', label: 'Insurance expiry reminders', dayKey: 'insuranceReminderDays' },
            { key: 'rtaReminder', label: 'RTA registration expiry reminders', dayKey: 'rtaReminderDays' },
            { key: 'paymentReminder', label: 'Payment due reminders', dayKey: 'paymentReminderDays' },
          ].map(({ key, label, dayKey }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(notifications as any)[key]}
                    onChange={e => setNotifications({...notifications, [key]: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                </label>
                <span className="text-sm text-gray-700">{label}</span>
              </div>
              {dayKey && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={(notifications as any)[dayKey]}
                    onChange={e => setNotifications({...notifications, [dayKey]: +e.target.value})}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:border-brand"
                  />
                  <span className="text-xs text-gray-400">days before</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-red-500" />
          </div>
          <h2 className="font-semibold text-gray-900">Security</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" placeholder="Enter current password" className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" placeholder="Enter new password" className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <p className="text-xs text-gray-400">Password change requires the ADMIN_PASSWORD environment variable to be updated on the server.</p>
        </div>
      </section>
    </div>
  );
}
