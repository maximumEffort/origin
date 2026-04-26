'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, Car, CalendarCheck, Users,
  FileText, BarChart2, LogOut, Menu, X, Settings, Activity,
} from 'lucide-react';
import { useState } from 'react';
// Auth tokens are managed via httpOnly cookies — cleared by /api/auth/logout

const nav = [
  { href: '/',          icon: LayoutDashboard, label: 'Overview' },
  { href: '/fleet',     icon: Car,             label: 'Fleet' },
  { href: '/bookings',  icon: CalendarCheck,   label: 'Bookings' },
  { href: '/customers', icon: Users,           label: 'Customers' },
  { href: '/leases',    icon: FileText,        label: 'Leases' },
  { href: '/reports',   icon: BarChart2,       label: 'Reports' },
  { href: '/status',    icon: Activity,        label: 'System Status' },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    // Force a full page reload to clear in-memory state (DataProvider's
    // cached vehicles/customers/bookings/leases). Otherwise a subsequent
    // sign-in on the same browser briefly shows the previous session's data.
    window.location.href = '/login';
  };

  const links = (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {nav.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === href
              ? 'bg-brand text-white'
              : 'text-gray-600 hover:bg-brand-light hover:text-brand',
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );

  const signOutBtn = (
    <div className="px-3 py-4 border-t border-gray-200">
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
      >
        <LogOut size={18} />
        {signingOut ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 min-h-screen">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs tracking-wide">OR</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Origin</div>
            <div className="text-xs text-gray-400">Admin Dashboard</div>
          </div>
        </div>
        {links}
        {signOutBtn}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-wide">OR</span>
          </div>
          <span className="font-semibold text-sm text-gray-900">Origin Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-gray-600">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)}>
          <aside className="w-64 bg-white h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="h-14 border-b border-gray-200 flex items-center px-4 gap-2.5">
              <div className="w-7 h-7 bg-brand rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs tracking-wide">OR</span>
              </div>
              <span className="font-semibold text-sm text-gray-900">Origin Admin</span>
            </div>
            {links}
            {signOutBtn}
          </aside>
        </div>
      )}
    </>
  );
}
