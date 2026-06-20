import {
  AlertTriangle,
  ChevronRight,
  CreditCard,
  FileSignature,
  GitBranch,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedActionCount, seedActions, type ActionSeed } from '../../seed/orgOwnerHome';

const ICON_MAP: Record<ActionSeed['iconKey'], LucideIcon> = {
  recon: GitBranch,
  approve: CreditCard,
  collect: Inbox,
  contract: FileSignature,
  flag: AlertTriangle,
};

const TONE_MAP: Record<ActionSeed['tone'], string> = {
  neutral: 'bg-white/80 text-ink-soft',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function ActionCenterCard() {
  return (
    <GlassSurface tone="strong" className="flex h-full flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">Action Center</h3>
        <span className="inline-flex items-center justify-center rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white">
          {seedActionCount}
        </span>
      </header>
      <ul className="flex flex-col gap-2">
        {seedActions.map((a) => (
          <ActionRow key={a.id} action={a} />
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white/65 py-2.5 text-[13px] font-semibold text-brand ring-1 ring-white/70 hover:bg-white"
      >
        View all actions
        <ChevronRight className="size-3.5" />
      </button>
    </GlassSurface>
  );
}

function ActionRow({ action: a }: { action: ActionSeed }) {
  const Icon = ICON_MAP[a.iconKey];
  return (
    <li>
      <button
        type="button"
        className="group flex w-full items-center gap-3 rounded-2xl bg-white/55 p-2.5 text-left ring-1 ring-white/60 hover:bg-white"
      >
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE_MAP[a.tone])}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{a.title}</p>
          <p className="truncate text-[11px] text-ink-muted">{a.subtitle}</p>
        </div>
        <ChevronRight className="size-4 text-ink-muted group-hover:text-ink" />
      </button>
    </li>
  );
}
