'use client';

import Sidebar from '@/components/Sidebar';
import { DataProvider } from '@/lib/data-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 md:p-8 p-4 pt-16 md:pt-8 overflow-auto">
          {children}
        </main>
      </div>
    </DataProvider>
  );
}
