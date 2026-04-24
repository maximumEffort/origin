'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, CalendarCheck, Users, FileText, AlertTriangle, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useData } from '@/lib/data-store';
import { api } from '@/lib/api';

interface DashboardStats {
  totalCustomers: number;
  pendingKyc: number;
  pendingBookings: number;
  activeLeases: number;
  availableVehicles: number;
  totalRevenueAed: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function OverviewPage() {
  const { vehicles, bookings, leases, loading } = useData();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>('/admin/stats').then(setStats).catch(() => {});
  }, []);

  const leasedVehicles = vehicles.filter(v => v.status === 'LEASED').length;
  const overduePayments = leases.filter(l => l.nextPayment?.status === 'OVERDUE').length;
  const recentBookings = bookings.slice(0, 5);
  const hasAlerts = overduePayments > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}</h1>
          <p className="text-gray-500 mt-1 text-sm">Here&apos;s what&apos;s happening with your fleet today.</p>
        </div>
        <Link href="/fleet" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-dark transition-colors">
          + Add Vehicle
        </Link>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="space-y-2">
          {overduePayments > 0 && (
            <Link href="/leases" className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 hover:bg-red-100 transition-colors group">
              <span className="flex items-center gap-3">
                <AlertTriangle size={16} className="shrink-0" />
                <span><strong>{overduePayments} overdue payments</strong> require attention.</span>
              </span>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          )}
          {(stats?.pendingKyc ?? 0) > 0 && (
            <Link href="/customers" className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 hover:bg-amber-100 transition-colors group">
              <span className="flex items-center gap-3">
                <AlertTriangle size={16} className="shrink-0" />
                <span><strong>{stats?.pendingKyc} customers</strong> have KYC pending review.</span>
              </span>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Available Vehicles" value={stats?.availableVehicles ?? vehicles.filter(v => v.status === 'AVAILABLE').length} icon={Car} color="green" />
        <StatCard title="Leased Vehicles" value={leasedVehicles} icon={Car} color="blue" />
        <StatCard title="Pending Bookings" value={stats?.pendingBookings ?? bookings.filter(b => b.status === 'SUBMITTED').length} icon={CalendarCheck} color="amber" trendValue="Action needed" trend="neutral" />
        <StatCard title="Active Leases" value={stats?.activeLeases ?? leases.filter(l => l.status === 'ACTIVE').length} icon={FileText} color="brand" />
        <StatCard title="Total Customers" value={stats?.totalCustomers ?? 0} icon={Users} color="blue" />
        <StatCard title="Total Revenue" value={`AED ${(stats?.totalRevenueAed ?? 0).toLocaleString()}`} icon={TrendingUp} color="green" subtitle="all-time paid" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Review Bookings', count: stats?.pendingBookings ?? 0, href: '/bookings', urgent: true },
          { label: 'Active Leases', count: stats?.activeLeases ?? 0, href: '/leases', urgent: false },
          { label: 'Fleet Status', count: `${stats?.availableVehicles ?? 0} free`, href: '/fleet', urgent: false },
          { label: 'View Reports', count: 'Monthly', href: '/reports', urgent: false },
        ].map(({ label, count, href, urgent }) => (
          <Link key={href} href={href} className={`flex flex-col p-4 rounded-xl border transition-all hover:shadow-sm group ${urgent ? 'bg-brand-light border-brand/20 hover:border-brand/40' : 'bg-white border-gray-200 hover:border-brand/20'}`}>
            <span className={`text-xs font-medium mb-1 ${urgent ? 'text-brand' : 'text-gray-500'}`}>{label}</span>
            <span className={`text-lg font-bold ${urgent ? 'text-brand' : 'text-gray-900'}`}>{count}</span>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/bookings" className="text-sm text-brand hover:underline font-medium">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Vehicle</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{b.ref}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{b.customer}</td>
                  <td className="px-6 py-4 text-gray-600">{b.vehicle}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{b.start}</td>
                  <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                  <td className="px-6 py-4">
                    <Link href="/bookings" className="text-xs text-brand hover:underline">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
