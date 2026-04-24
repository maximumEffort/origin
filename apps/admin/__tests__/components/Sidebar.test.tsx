import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

// Override usePathname for specific tests
const mockUsePathname = jest.fn().mockReturnValue('/');
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => mockUsePathname(),
}));

// Mock lucide-react icons as simple spans
jest.mock('lucide-react', () => {
  const icons = [
    'LayoutDashboard', 'Car', 'CalendarCheck', 'Users',
    'FileText', 'BarChart2', 'LogOut', 'Menu', 'X', 'Settings', 'Activity',
  ];
  const mocks: Record<string, unknown> = {};
  icons.forEach((name) => {
    mocks[name] = (props: { size?: number }) => <span data-testid={`icon-${name}`} />;
  });
  return mocks;
});

beforeEach(() => {
  mockUsePathname.mockReturnValue('/');
  mockPush.mockReset();
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
});

const navLabels = [
  'Overview', 'Fleet', 'Bookings', 'Customers',
  'Leases', 'Reports', 'System Status', 'Settings',
];

describe('Sidebar', () => {
  it('renders all navigation links', () => {
    render(<Sidebar />);

    for (const label of navLabels) {
      // Each label appears twice (desktop + mobile) — at least one should exist
      const links = screen.getAllByText(label);
      expect(links.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('highlights the active link based on current pathname', () => {
    mockUsePathname.mockReturnValue('/fleet');
    render(<Sidebar />);

    const fleetLinks = screen.getAllByText('Fleet');
    // The active link should have 'bg-brand text-white' (exact active class)
    const activeLink = fleetLinks.find((el) =>
      el.closest('a')?.className.includes('bg-brand text-white'),
    );
    expect(activeLink).toBeDefined();

    // A non-active link should NOT have 'bg-brand text-white'
    const overviewLinks = screen.getAllByText('Overview');
    const inactiveLink = overviewLinks.find((el) =>
      el.closest('a')?.className.includes('bg-brand text-white'),
    );
    expect(inactiveLink).toBeUndefined();
  });

  it('renders a sign out button', () => {
    render(<Sidebar />);

    const signOutButtons = screen.getAllByText('Sign Out');
    expect(signOutButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('sign out button has correct role', () => {
    render(<Sidebar />);

    const buttons = screen.getAllByRole('button');
    const signOutBtn = buttons.find(
      (btn) => btn.textContent?.includes('Sign Out'),
    );
    expect(signOutBtn).toBeDefined();
  });
});
