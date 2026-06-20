import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

// Persistent chrome wrapping every routed page. Sidebar + (TopBar + main).
// Uses h-dvh + w-full (not w-screen, which adds the scrollbar width and causes
// a horizontal overflow). The content column owns all horizontal padding so
// pages fill the available width.
export function AppShell({ children }: { children: ReactNode }) {
  // The root carries CSS `zoom: var(--app-zoom)`. Viewport units (dvh/vw) are
  // NOT pre-divided by zoom, so a plain `h-dvh` would leave a gap. Dividing the
  // height/width by the zoom factor makes the rendered box fill the window.
  return (
    <div
      className="flex w-full overflow-hidden"
      style={{
        height: 'calc(100dvh / var(--app-zoom, 1))',
        width: 'calc(100vw / var(--app-zoom, 1))',
      }}
    >
      <div className="pl-3">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden pb-10">{children}</main>
      </div>
    </div>
  );
}
