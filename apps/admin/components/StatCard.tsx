import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'brand' | 'green' | 'blue' | 'amber';
}

const colorMap = {
  brand: 'bg-brand-light text-brand',
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'brand' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colorMap[color])}>
          <Icon size={20} />
        </div>
        {trendValue && (
          <span className={clsx('text-xs font-medium px-2 py-1 rounded-full',
            trend === 'up' ? 'bg-green-50 text-green-600' :
            trend === 'down' ? 'bg-red-50 text-red-500' :
            'bg-gray-100 text-gray-500'
          )}>
            {trendValue}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-600">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}