'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Car, DollarSign, Users } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { useData } from '@/lib/data-store';

const BRAND_COLORS: Record<string, string> = {
  NIO: '#3B82F6',
  Voyah: '#10B981',
  Zeekr: '#8B5CF6',
  BYD: '#EF4444',
};
const DEFAULT_COLOR = '#6B7280';

function ChartPlaceholder({ height }: { height: number }) {
  return <div style={{ height }} className="animate-pulse bg-gray-50 rounded-lg" />;
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { vehicles, leases, customers } = useData();

  // ── Derive brand mix from real vehicles ──
  const brandCounts: Record<string, number> = {};
  for (const v of vehicles) {
    brandCounts[v.brand] = (brandCounts[v.brand] ?? 0) + 1;
  }
  const brandMix = Object.entries(brandCounts).map(([name, value]) => ({
    name, value, color: BRAND_COLORS[name] ?? DEFAULT_COLOR,
  }));
  const totalVehicles = vehicles.length || 1;

  // ── Derive fleet utilisation from real data ──
  const leasedCount = vehicles.filter(v => v.status === 'LEASED').length;
  const utilPct = totalVehicles > 0 ? Math.round((leasedCount / totalVehicles) * 100) : 0;

  // ── Derive revenue from active leases ──
  const activeLeases = leases.filter(l => l.status === 'ACTIVE');
  const monthlyRevenue = activeLeases.reduce((sum, l) => sum + l.monthlyAed, 0);
  const vatCollected = Math.round(monthlyRevenue * 0.05);

  // ── Customer stats ──
  const totalCustomers = customers.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 mt-0.5">Live data · All amounts in AED excl. 5% VAT</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Monthly Revenue"
          value={`AED ${monthlyRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="green"
          subtitle="from active leases"
        />
        <StatCard
          title="VAT (5%)"
          value={`AED ${vatCollected.toLocaleString()}`}
          icon={DollarSign}
          color="blue"
          subtitle="5% of revenue"
        />
        <StatCard
          title="Fleet Utilisation"
          value={`${utilPct}%`}
          icon={Car}
          color="brand"
          subtitle={`${leasedCount} of ${totalVehicles} leased`}
        />
        <StatCard
          title="Total Customers"
          value={String(totalCustomers)}
          icon={Users}
          color="amber"
          subtitle="registered"
        />
      </div>

      {/* Brand mix */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Fleet Brand Mix</h2>
        {brandMix.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No vehicles in fleet</p>
        ) : (
          <div className="flex items-center gap-8">
            {mounted ? (
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={brandMix} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {brandMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} vehicles`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartPlaceholder height={200} />}
            <div className="flex-1 space-y-3">
              {brandMix.map((b) => (
                <div key={b.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: b.color }} />
                    <span className="text-sm font-medium text-gray-700">{b.name}</span>
                  </div>
                  <div className="text-sm text-gray-500">{b.value} vehicles · {((b.value / totalVehicles) * 100).toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
