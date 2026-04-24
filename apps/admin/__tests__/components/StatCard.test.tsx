import { render, screen } from '@testing-library/react';
import StatCard from '@/components/StatCard';
import { Car } from 'lucide-react';

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Car: (props: { size?: number }) => <span data-testid="icon-car" />,
}));

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Vehicles" value={42} icon={Car} />);

    expect(screen.getByText('Total Vehicles')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(<StatCard title="Revenue" value="AED 125,000" icon={Car} />);

    expect(screen.getByText('AED 125,000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <StatCard title="Fleet" value={10} icon={Car} subtitle="Active vehicles" />,
    );

    expect(screen.getByText('Active vehicles')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<StatCard title="Fleet" value={10} icon={Car} />);

    expect(screen.queryByText('Active vehicles')).not.toBeInTheDocument();
  });

  it('renders trend value with up trend styling', () => {
    render(
      <StatCard title="Revenue" value="AED 50K" icon={Car} trend="up" trendValue="+12%" />,
    );

    const trendEl = screen.getByText('+12%');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl.className).toContain('bg-green-50');
    expect(trendEl.className).toContain('text-green-600');
  });

  it('renders trend value with down trend styling', () => {
    render(
      <StatCard title="Bookings" value={5} icon={Car} trend="down" trendValue="-8%" />,
    );

    const trendEl = screen.getByText('-8%');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl.className).toContain('bg-red-50');
    expect(trendEl.className).toContain('text-red-500');
  });

  it('renders trend value with neutral trend styling', () => {
    render(
      <StatCard title="Customers" value={100} icon={Car} trend="neutral" trendValue="0%" />,
    );

    const trendEl = screen.getByText('0%');
    expect(trendEl).toBeInTheDocument();
    expect(trendEl.className).toContain('bg-gray-100');
  });

  it('does not render trend when trendValue is not provided', () => {
    const { container } = render(
      <StatCard title="Fleet" value={10} icon={Car} trend="up" />,
    );

    // No trend badge should appear
    expect(container.querySelector('.rounded-full')).toBeNull();
  });

  it('applies default brand color', () => {
    const { container } = render(
      <StatCard title="Test" value={1} icon={Car} />,
    );

    const iconWrapper = container.querySelector('.bg-brand-light');
    expect(iconWrapper).not.toBeNull();
  });

  it('applies green color variant', () => {
    const { container } = render(
      <StatCard title="Test" value={1} icon={Car} color="green" />,
    );

    const iconWrapper = container.querySelector('.bg-green-50');
    expect(iconWrapper).not.toBeNull();
  });

  it('applies blue color variant', () => {
    const { container } = render(
      <StatCard title="Test" value={1} icon={Car} color="blue" />,
    );

    const iconWrapper = container.querySelector('.bg-blue-50');
    expect(iconWrapper).not.toBeNull();
  });

  it('applies amber color variant', () => {
    const { container } = render(
      <StatCard title="Test" value={1} icon={Car} color="amber" />,
    );

    const iconWrapper = container.querySelector('.bg-amber-50');
    expect(iconWrapper).not.toBeNull();
  });
});
