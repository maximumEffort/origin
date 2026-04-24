import clsx from 'clsx';

const styles: Record<string, string> = {
  AVAILABLE:  'bg-green-50 text-green-700',
  ACTIVE:     'bg-green-50 text-green-700',
  APPROVED:   'bg-green-50 text-green-700',
  PAID:       'bg-green-50 text-green-700',
  SUBMITTED:  'bg-blue-50 text-blue-700',
  PENDING:    'bg-amber-50 text-amber-700',
  DRAFT:      'bg-gray-100 text-gray-500',
  LEASED:     'bg-purple-50 text-purple-700',
  MAINTENANCE:'bg-orange-50 text-orange-700',
  REJECTED:   'bg-red-50 text-red-600',
  OVERDUE:    'bg-red-50 text-red-600',
  CANCELLED:  'bg-gray-100 text-gray-500',
  COMPLETED:  'bg-gray-100 text-gray-500',
  RETIRED:    'bg-gray-100 text-gray-400',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', styles[status] ?? 'bg-gray-100 text-gray-500')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}