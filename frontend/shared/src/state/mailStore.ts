import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSession } from '../auth/hooks';
import { seedMailFor, type MailFolder, type MailMessage } from '../seed/mail';

// In-app mailbox — PER USER. Every user has their own inbox, sent items and
// connection state, keyed by their email. Nothing is shared across people or
// roles: switching user shows that user's own mailbox.

interface ComposeInput {
  toName: string;
  toEmail: string;
  subject: string;
  body: string;
  label?: MailMessage['label'];
  agentDrafted?: boolean;
}

interface UserMailbox {
  connected: boolean;
  account: string | null;
  provider: string | null;
  messages: MailMessage[];
}

const emptyMailbox: UserMailbox = { connected: false, account: null, provider: null, messages: [] };

interface MailState {
  byUser: Record<string, UserMailbox>;
  ensure: (email: string, name: string, role: string) => void;
  connect: (email: string, account: string, provider: string) => void;
  disconnect: (email: string) => void;
  send: (email: string, input: ComposeInput) => void;
  markRead: (email: string, id: string) => void;
  toggleStar: (email: string, id: string) => void;
}

const patch = (s: MailState, email: string, fn: (mb: UserMailbox) => UserMailbox): Partial<MailState> => ({
  byUser: { ...s.byUser, [email]: fn(s.byUser[email] ?? emptyMailbox) },
});

export const useMailStore = create<MailState>()(
  persist(
    (set, get) => ({
      byUser: {},
      ensure: (email, name, role) => {
        if (get().byUser[email]) return;
        set((s) => ({ byUser: { ...s.byUser, [email]: { connected: false, account: null, provider: null, messages: seedMailFor(email, name, role) } } }));
      },
      connect: (email, account, provider) => set((s) => patch(s, email, (mb) => ({ ...mb, connected: true, account, provider }))),
      disconnect: (email) => set((s) => patch(s, email, (mb) => ({ ...mb, connected: false, account: null, provider: null }))),
      send: (email, input) =>
        set((s) =>
          patch(s, email, (mb) => ({
            ...mb,
            messages: [
              {
                id: `m-${Date.now()}`,
                folder: 'sent',
                fromName: 'You',
                fromEmail: mb.account ?? email,
                toName: input.toName,
                toEmail: input.toEmail,
                subject: input.subject,
                preview: input.body.slice(0, 80),
                body: input.body,
                date: new Date().toISOString(),
                read: true,
                starred: false,
                ...(input.label ? { label: input.label } : {}),
                ...(input.agentDrafted ? { agentDrafted: true } : {}),
              },
              ...mb.messages,
            ],
          })),
        ),
      markRead: (email, id) => set((s) => patch(s, email, (mb) => ({ ...mb, messages: mb.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) }))),
      toggleStar: (email, id) => set((s) => patch(s, email, (mb) => ({ ...mb, messages: mb.messages.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)) }))),
    }),
    { name: 'kora.mail', partialize: (s) => ({ byUser: s.byUser }) },
  ),
);

// Resolve the current user's identity from the session and ensure their mailbox
// is seeded. Returns the email to key all mail actions by.
export function useCurrentMailUser() {
  const session = useSession();
  const email = session?.user.email ?? 'guest@kora.local';
  const name = session?.user.displayName ?? 'You';
  const role = session?.roles[0]?.name ?? '';
  const ensure = useMailStore((s) => s.ensure);
  useEffect(() => {
    ensure(email, name, role);
  }, [email, name, role, ensure]);
  return { email, name };
}

// Live unread count for the current user (used by the top-bar badge).
export function useUnreadCount(): number {
  const { email } = useCurrentMailUser();
  return useMailStore((s) => (s.byUser[email]?.messages ?? []).filter((m) => m.folder === 'inbox' && !m.read).length);
}

export type { MailFolder, MailMessage };
