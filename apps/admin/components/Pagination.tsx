'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Optional. Render a page-size selector if provided. */
  onLimitChange?: (limit: number) => void;
  /** Hide the whole component when total is 0. Default: true. */
  hideWhenEmpty?: boolean;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

/**
 * Compact pagination control for admin list views (#126).
 *
 * Shows: "Showing X-Y of Z   [← Prev] [1] [2] [3] ... [N] [Next →]"
 *
 * Page numbers collapse with leading/trailing ellipsis once there are
 * more than 7 pages so the row stays narrow. When totalPages <= 1, the
 * Prev/Next nav hides but the count + per-page selector stay visible
 * so the admin always sees how many records they're looking at.
 */
export default function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  hideWhenEmpty = true,
  className = '',
}: Props) {
  if (hideWhenEmpty && total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const showNav = totalPages > 1;
  const pageNumbers = compactPageList(page, totalPages);

  return (
    <div className={`flex items-center justify-between gap-4 flex-wrap text-sm ${className}`}>
      <div className="text-gray-500">
        Showing <span className="font-medium text-gray-900">{start.toLocaleString()}</span>–
        <span className="font-medium text-gray-900">{end.toLocaleString()}</span> of{' '}
        <span className="font-medium text-gray-900">{total.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2">
        {onLimitChange && (
          <label className="flex items-center gap-2 text-gray-500 mr-2">
            Per page
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:border-brand"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        )}

        {showNav && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex items-center gap-1 px-2 py-1.5 border border-gray-200 rounded-md text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            <ul className="flex items-center gap-1" role="navigation" aria-label="Pagination">
              {pageNumbers.map((p, i) =>
                p === 'ellipsis' ? (
                  <li key={`e-${i}`} className="px-2 text-gray-400" aria-hidden="true">…</li>
                ) : (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => onPageChange(p)}
                      aria-current={p === page ? 'page' : undefined}
                      aria-label={`Go to page ${p}`}
                      className={`min-w-[32px] px-2 py-1 rounded-md border text-sm transition-colors ${
                        p === page
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  </li>
                )
              )}
            </ul>

            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-1 px-2 py-1.5 border border-gray-200 rounded-md text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Build a page list that always includes 1, current±1, totalPages,
 * with 'ellipsis' markers between gaps. For totalPages ≤ 7, returns the full range.
 *
 * Examples (current=5, total=10): [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
 *          (current=1, total=10): [1, 2, 3, 'ellipsis', 10]
 */
function compactPageList(
  current: number,
  totalPages: number,
): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];

  // Window around current
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);

  if (left > 2) pages.push('ellipsis');
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < totalPages - 1) pages.push('ellipsis');

  pages.push(totalPages);
  return pages;
}
