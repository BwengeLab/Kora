import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Inbox, Mail, PenSquare, Reply, Search, Send, Sparkles, Star, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../../app/shell';
import { fetchMailbox, markMailboxMessageRead, toggleMailboxMessageStar } from '../../api/accountMailbox';
import { getApiBaseUrl } from '../../api/client';
import { useSession } from '../../auth/hooks';
import { GlassSurface, PartyAvatar, cn } from '../../design-system';
import type { MailFolder, MailMessage } from '../../state/mailStore';
import { ComposeModal } from './ComposeModal';
import { ConnectMail } from './ConnectMail';

const FOLDERS: { id: MailFolder; label: string; icon: LucideIcon }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'archive', label: 'Archive', icon: Archive },
];

const EMPTY: MailMessage[] = [];

const LABEL_TONE: Record<NonNullable<MailMessage['label']>, string> = {
  collections: 'bg-warning-soft text-warning',
  claims: 'bg-info-soft text-info',
  approval: 'bg-brand-soft text-brand-ink',
  audit: 'bg-danger-soft text-danger',
  general: 'bg-white/70 text-ink-soft',
};

export function Mailbox() {
  const session = useSession();
  const apiBaseUrl = getApiBaseUrl();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['mailbox', session?.user.email],
    queryFn: ({ signal }) => fetchMailbox(apiBaseUrl, session!.token, signal),
    enabled: Boolean(session?.token),
    staleTime: 30_000,
  });

  const connected = data?.connected ?? false;
  const messages = data?.messages ?? EMPTY;
  const account = data?.account ?? null;

  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [compose, setCompose] = useState(false);
  const [reply, setReply] = useState<{ toName: string; toEmail: string; subject: string } | undefined>(undefined);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages
      .filter((message) => message.folder === folder)
      .filter((message) => (q === '' ? true : [message.subject, message.fromName, message.toName, message.preview].some((value) => value.toLowerCase().includes(q))))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [messages, folder, query]);

  const selected = messages.find((message) => message.id === selectedId) ?? list[0] ?? null;
  const unread = messages.filter((message) => message.folder === 'inbox' && !message.read).length;

  const markRead = async (messageId: string) => {
    if (!session?.token) return;
    await markMailboxMessageRead(apiBaseUrl, session.token, messageId);
    await queryClient.invalidateQueries({ queryKey: ['mailbox'] });
  };

  const toggleStar = async (messageId: string) => {
    if (!session?.token) return;
    await toggleMailboxMessageStar(apiBaseUrl, session.token, messageId);
    await queryClient.invalidateQueries({ queryKey: ['mailbox'] });
  };

  if (!connected) return <ConnectMail />;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Mail"
        subtitle={<>Connected as <span className="font-semibold text-ink">{account}</span> - your work inbox, inside Kora.</>}
        right={
          <button type="button" onClick={() => { setReply(undefined); setCompose(true); }} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
            <PenSquare className="size-4" /> Compose
          </button>
        }
      />
      <div className="flex min-h-0 flex-1 gap-5 px-8 pb-6">
        <GlassSurface tone="strong" className="flex w-[200px] shrink-0 flex-col gap-1 p-3">
          {FOLDERS.map((item) => {
            const count = item.id === 'inbox' ? unread : messages.filter((message) => message.folder === item.id).length;
            return (
              <button key={item.id} type="button" onClick={() => { setFolder(item.id); setSelectedId(null); }} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors', folder === item.id ? 'bg-white text-ink shadow-glass-soft' : 'text-ink-soft hover:bg-white/55 hover:text-ink')}>
                <item.icon className="size-[18px]" />
                <span className="flex-1 text-left">{item.label}</span>
                {count > 0 ? <span className={cn('rounded-full px-1.5 text-[11px] font-bold', item.id === 'inbox' ? 'bg-brand text-white' : 'text-ink-muted')}>{count}</span> : null}
              </button>
            );
          })}
        </GlassSurface>

        <GlassSurface tone="strong" className="flex w-[340px] shrink-0 flex-col">
          <div className="p-3">
            <div className="flex h-10 items-center gap-2.5 rounded-xl bg-white/70 px-3.5 ring-1 ring-white/70">
              <Search className="size-4 text-ink-muted" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mail..." className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none" />
            </div>
          </div>
          <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
            {list.map((message) => (
              <li key={message.id}>
                <button type="button" onClick={() => { setSelectedId(message.id); if (!message.read) void markRead(message.id); }} className={cn('flex w-full flex-col gap-1 border-b border-white/40 px-4 py-3 text-left transition-colors', selected?.id === message.id ? 'bg-white' : 'hover:bg-white/55', !message.read && folder === 'inbox' && 'bg-brand-soft/30')}>
                  <div className="flex items-center gap-2">
                    <p className={cn('flex-1 truncate text-[13px]', message.read ? 'font-semibold text-ink-soft' : 'font-bold text-ink')}>{folder === 'sent' ? message.toName : message.fromName}</p>
                    <span className="shrink-0 text-[10.5px] text-ink-muted">{new Date(message.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p className={cn('truncate text-[12.5px]', message.read ? 'text-ink-soft' : 'font-semibold text-ink')}>{message.subject}</p>
                  <p className="truncate text-[11px] text-ink-muted">{message.preview}</p>
                  {message.label ? <span className={cn('mt-0.5 w-fit rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', LABEL_TONE[message.label])}>{message.label}{message.agentDrafted ? ' · AI' : ''}</span> : null}
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className="grid place-items-center py-16 text-[13px] text-ink-muted">No messages.</li> : null}
          </ul>
        </GlassSurface>

        <GlassSurface tone="strong" className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <header className="flex items-start gap-3 border-b border-white/55 px-6 py-4">
                <PartyAvatar name={folder === 'sent' ? selected.toName : selected.fromName} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-ink">{selected.subject}</h2>
                  <p className="text-[12.5px] text-ink-muted">
                    {folder === 'sent' ? `To ${selected.toName} <${selected.toEmail}>` : `${selected.fromName} <${selected.fromEmail}>`} · {new Date(selected.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <button type="button" onClick={() => void toggleStar(selected.id)} aria-label="Star" className={cn('grid size-9 place-items-center rounded-xl', selected.starred ? 'text-warning' : 'text-ink-muted hover:bg-white/60')}>
                  <Star className={cn('size-4', selected.starred && 'fill-current')} />
                </button>
              </header>
              <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">
                {selected.agentDrafted ? (
                  <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-[11px] font-bold text-ai"><Sparkles className="size-3.5" /> Drafted by Kora</p>
                ) : null}
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{selected.body}</p>
              </div>
              <footer className="flex items-center gap-2 border-t border-white/55 px-6 py-3.5">
                <button type="button" onClick={() => { setReply({ toName: selected.fromName, toEmail: selected.fromEmail, subject: `Re: ${selected.subject}` }); setCompose(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
                  <Reply className="size-4" /> Reply
                </button>
              </footer>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-ink-muted">
              <div className="flex flex-col items-center gap-2"><Mail className="size-8" /><p className="text-[13px]">Select a message</p></div>
            </div>
          )}
        </GlassSurface>
      </div>

      <ComposeModal open={compose} onOpenChange={setCompose} prefill={reply} />
    </div>
  );
}
