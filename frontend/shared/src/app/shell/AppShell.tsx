import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

// Persistent chrome wrapping every routed page. Sidebar + (TopBar + main).
// Uses h-dvh + w-full (not w-screen, which adds the scrollbar width and causes
// a horizontal overflow). The content column owns all horizontal padding so
// pages fill the available width.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <div className="py-0 pl-3">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-10">{children}</main>
      </div>
    </div>
  );
}
