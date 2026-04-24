import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Origin — Admin',
  description: 'Internal admin dashboard for fleet, bookings, and customer management.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}