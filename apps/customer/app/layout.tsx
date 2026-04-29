import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Origin — Rent Chinese EVs in Dubai',
  description: 'Rent premium NIO, Voyah, Zeekr and BYD electric vehicles in Dubai, UAE. Flexible terms, comprehensive insurance, RTA compliant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
