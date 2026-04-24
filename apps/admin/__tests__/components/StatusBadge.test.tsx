import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="AVAILABLE" />);
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
  });

  it('replaces underscores with spaces in display text', () => {
    // If a status like "IN_PROGRESS" were used, underscores should become spaces
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
  });

  // Green statuses
  it.each(['AVAILABLE', 'ACTIVE', 'APPROVED', 'PAID'])(
    'renders %s with green styling',
    (status) => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByText(status);
      expect(badge.className).toContain('bg-green-50');
      expect(badge.className).toContain('text-green-700');
    },
  );

  // Blue status
  it('renders SUBMITTED with blue styling', () => {
    render(<StatusBadge status="SUBMITTED" />);
    const badge = screen.getByText('SUBMITTED');
    expect(badge.className).toContain('bg-blue-50');
    expect(badge.className).toContain('text-blue-700');
  });

  // Amber status
  it('renders PENDING with amber styling', () => {
    render(<StatusBadge status="PENDING" />);
    const badge = screen.getByText('PENDING');
    expect(badge.className).toContain('bg-amber-50');
    expect(badge.className).toContain('text-amber-700');
  });

  // Purple status
  it('renders LEASED with purple styling', () => {
    render(<StatusBadge status="LEASED" />);
    const badge = screen.getByText('LEASED');
    expect(badge.className).toContain('bg-purple-50');
    expect(badge.className).toContain('text-purple-700');
  });

  // Orange status
  it('renders MAINTENANCE with orange styling', () => {
    render(<StatusBadge status="MAINTENANCE" />);
    const badge = screen.getByText('MAINTENANCE');
    expect(badge.className).toContain('bg-orange-50');
    expect(badge.className).toContain('text-orange-700');
  });

  // Red statuses
  it.each(['REJECTED', 'OVERDUE'])('renders %s with red styling', (status) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(status);
    expect(badge.className).toContain('bg-red-50');
  });

  // Gray statuses
  it.each(['DRAFT', 'CANCELLED', 'COMPLETED'])(
    'renders %s with gray styling',
    (status) => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByText(status);
      expect(badge.className).toContain('bg-gray-100');
    },
  );

  // Retired has slightly different gray text
  it('renders RETIRED with gray styling', () => {
    render(<StatusBadge status="RETIRED" />);
    const badge = screen.getByText('RETIRED');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-400');
  });

  // Unknown status falls back to gray
  it('renders unknown status with fallback gray styling', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    const badge = screen.getByText('UNKNOWN STATUS');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-500');
  });
});
