import { Bell, Globe, LogOut, Shield, User } from 'lucide-react';
import { PageHeader } from '../../app/shell';
import { useSession } from '../../auth/hooks';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import { useMyPersonalSettings, usePersonalSettingsStore, type PersonalSettings } from '../../state/personalSettingsStore';
import { toast } from '../../state/toastStore';

// Personal Account & Preferences — scoped to the signed-in user. This is the
// gear-icon destination: YOUR profile, YOUR preferences, YOUR notifications.
// Org-wide configuration lives separately in the Admin Console (/settings).
export function AccountSettings() {
  const session = useSession();
  const { email, settings } = useMyPersonalSettings();
  const update = usePersonalSettingsStore((s) => s.update);
  const set = <K extends keyof PersonalSettings>(k: K, v: PersonalSettings[K]) => update(email, { [k]: v } as Partial<PersonalSettings>);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Account & Preferences" subtitle="Your personal profile and settings — only you see and control these." />
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-8 pb-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {/* Identity */}
          <GlassSurface tone="strong" className="flex items-center gap-4 p-5">
            <PartyAvatar name={settings.displayName} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-ink">{settings.displayName}</p>
              <p className="text-[12.5px] text-ink-muted">{settings.jobTitle} · {email}</p>
            </div>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">Signed in</span>
          </GlassSurface>

          {/* Profile */}
          <Section icon={<User className="size-4" />} title="Profile">
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Full name" value={settings.displayName} onChange={(v) => set('displayName', v)} />
              <TextField label="Job title" value={settings.jobTitle} onChange={(v) => set('jobTitle', v)} />
              <TextField label="Phone" value={settings.phone} onChange={(v) => set('phone', v)} />
              <TextField label="Email" value={email} readOnly />
            </div>
          </Section>

          {/* Preferences */}
          <Section icon={<Globe className="size-4" />} title="Preferences">
            <div className="grid grid-cols-3 gap-4">
              <SelectField label="Language" value={settings.language} options={[['en', 'English'], ['fr', 'Français'], ['rw', 'Kinyarwanda']]} onChange={(v) => set('language', v as PersonalSettings['language'])} />
              <SelectField label="Theme" value={settings.theme} options={[['system', 'System'], ['light', 'Light']]} onChange={(v) => set('theme', v as PersonalSettings['theme'])} />
              <SelectField label="Date format" value={settings.dateFormat} options={[['DMY', 'DD/MM/YYYY'], ['MDY', 'MM/DD/YYYY'], ['ISO', 'YYYY-MM-DD']]} onChange={(v) => set('dateFormat', v as PersonalSettings['dateFormat'])} />
            </div>
          </Section>

          {/* Notifications */}
          <Section icon={<Bell className="size-4" />} title="Notifications">
            <div className="flex flex-col gap-2">
              <ToggleRow label="Approvals awaiting me" desc="Alert when an item needs my decision." on={settings.notifyApprovals} onToggle={(v) => set('notifyApprovals', v)} />
              <ToggleRow label="Mentions" desc="When a teammate @mentions me." on={settings.notifyMentions} onToggle={(v) => set('notifyMentions', v)} />
              <ToggleRow label="Daily digest" desc="A morning summary email." on={settings.notifyDigest} onToggle={(v) => set('notifyDigest', v)} />
              <ToggleRow label="Agent suggestions" desc="When Kora flags something for me." on={settings.notifyAgent} onToggle={(v) => set('notifyAgent', v)} />
            </div>
          </Section>

          {/* Security */}
          <Section icon={<Shield className="size-4" />} title="Security">
            <ToggleRow label="Two-factor authentication" desc="Require a second factor at sign-in." on={settings.twoFactor} onToggle={(v) => set('twoFactor', v)} />
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/55 p-3.5 ring-1 ring-white/60">
              <div><p className="text-[13px] font-semibold text-ink">This session</p><p className="text-[11.5px] text-ink-muted">{session?.tenant.name ?? 'Acme'} · Kigali · started today</p></div>
              <button type="button" onClick={() => toast({ tone: 'info', title: 'Signed out elsewhere', body: 'All other sessions were ended.' })} className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-1.5 text-[12px] font-bold text-danger ring-1 ring-white/70 hover:bg-white"><LogOut className="size-3.5" /> Sign out other sessions</button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <GlassSurface tone="strong" className="p-5">
      <header className="mb-4 flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-brand-ink">{icon}</span><h3 className="font-display text-[15px] font-bold text-ink">{title}</h3></header>
      {children}
    </GlassSurface>
  );
}

function TextField({ label, value, onChange, readOnly }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <input value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} className={cn('h-11 rounded-xl px-3.5 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30', readOnly ? 'bg-white/40 text-ink-muted' : 'bg-white/70')} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl bg-white/70 px-3 text-[13.5px] font-semibold text-ink ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function ToggleRow({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onToggle(!on)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/55 p-3.5 text-left ring-1 ring-white/60 hover:bg-white/70">
      <div><p className="text-[13px] font-semibold text-ink">{label}</p><p className="text-[11.5px] text-ink-muted">{desc}</p></div>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-brand' : 'bg-ink/15')}><span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'left-[22px]' : 'left-0.5')} /></span>
    </button>
  );
}
