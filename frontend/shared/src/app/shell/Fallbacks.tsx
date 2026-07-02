import { Link } from '@tanstack/react-router';
import { AlertTriangle, Compass, Home, RotateCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlassSurface } from '../../design-system';

// Production-grade fallbacks: a page never white-screens. Route errors and 404s
// land on a branded panel; render crashes are caught by the boundary below.

function Panel({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-8 py-10">
      <GlassSurface tone="strong" className="flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-soft to-ai-soft text-brand-ink">{icon}</span>
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <p className="text-[14px] leading-relaxed text-ink-muted">{body}</p>
        <div className="mt-1 flex items-center gap-2">{children}</div>
      </GlassSurface>
    </div>
  );
}

const homeBtn = (
  <Link to="/" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/70 px-4 text-[13px] font-bold text-ink ring-1 ring-white/70 hover:bg-white">
    <Home className="size-4" /> Back to home
  </Link>
);

// Route-level error (thrown in a page/loader). TanStack passes error + reset.
export function RouteError({ error, reset }: { error: Error; reset?: () => void }) {
  return (
    <Panel icon={<AlertTriangle className="size-8" />} title="Something went wrong" body="This screen hit an unexpected error. You can retry, or head back — nothing you did was lost.">
      {reset ? (
        <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
          <RotateCw className="size-4" /> Try again
        </button>
      ) : null}
      {homeBtn}
      {import.meta.env?.DEV && error?.message ? (
        <p className="mt-3 w-full break-words rounded-xl bg-danger-soft/50 p-2.5 text-left font-mono text-[11px] text-danger">{error.message}</p>
      ) : null}
    </Panel>
  );
}

// 404.
export function NotFound() {
  return (
    <Panel icon={<Compass className="size-8" />} title="Page not found" body="That page doesn’t exist, or you don’t have access to it in your current role.">
      {homeBtn}
    </Panel>
  );
}

// Top-level boundary for render crashes anywhere in the shell (sidebar, top bar,
// providers) — a last line of defence so the app shows a graceful screen, never
// a blank page. A full reload is the safe recovery.
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where we'd report to the error service.
    console.error('Kora app error:', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="grid h-dvh w-full place-items-center bg-backdrop px-6">
          <GlassSurface tone="strong" className="flex max-w-md flex-col items-center gap-4 p-10 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-danger-soft text-danger"><AlertTriangle className="size-8" /></span>
            <h2 className="font-display text-2xl font-bold text-ink">Kora hit a snag</h2>
            <p className="text-[14px] leading-relaxed text-ink-muted">Something unexpected happened. Reloading usually fixes it.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-1 inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-5 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
              <RotateCw className="size-4" /> Reload Kora
            </button>
          </GlassSurface>
        </div>
      );
    }
    return this.props.children;
  }
}
