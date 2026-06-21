import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { useToastStore, type ToastTone } from '../../state/toastStore';

const ICON: Record<ToastTone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: AlertOctagon,
};
const TONE: Record<ToastTone, string> = {
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <GlassSurface
            key={t.id}
            tone="strong"
            className="pointer-events-auto flex items-start gap-3 p-3.5 shadow-glass-lg"
          >
            <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE[t.tone])}>
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink">{t.title}</p>
              {t.body ? <p className="text-[11.5px] text-ink-muted">{t.body}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </GlassSurface>
        );
      })}
    </div>
  );
}
