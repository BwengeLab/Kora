import * as Dialog from '@radix-ui/react-dialog';
import { Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../design-system';
import { useCurrentMailUser, useMailStore } from '../../state/mailStore';
import { toast } from '../../state/toastStore';

export function ComposeModal({ open, onOpenChange, prefill }: { open: boolean; onOpenChange: (v: boolean) => void; prefill?: { toName?: string; toEmail?: string; subject?: string; body?: string } | undefined }) {
  const { email } = useCurrentMailUser();
  const send = useMailStore((s) => s.send);
  const [toName, setToName] = useState(prefill?.toName ?? '');
  const [toEmail, setToEmail] = useState(prefill?.toEmail ?? '');
  const [subject, setSubject] = useState(prefill?.subject ?? '');
  const [body, setBody] = useState(prefill?.body ?? '');

  const submit = () => {
    if (!toEmail.trim() || !subject.trim()) {
      toast({ tone: 'warning', title: 'Add a recipient and subject' });
      return;
    }
    send(email, { toName: toName || toEmail, toEmail, subject, body });
    toast({ tone: 'success', title: 'Email sent', body: `To ${toName || toEmail}` });
    onOpenChange(false);
    setToName(''); setToEmail(''); setSubject(''); setBody('');
  };

  const draftWithAi = () => {
    setBody(
      `Dear ${toName || 'partner'},\n\nI'm writing regarding ${subject || 'our account'}. ${'[Kora drafted this opener — edit to suit.]'}\n\nKind regards,\nAcme Insurance`,
    );
    toast({ tone: 'info', title: 'Draft suggested', body: 'Kora drafted an opener — edit before sending.' });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-ink/25 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed bottom-5 right-5 z-[95] flex h-[560px] w-[min(520px,94vw)] flex-col overflow-hidden rounded-3xl border border-glass-border-strong bg-glass-strong shadow-glass-lg backdrop-blur-glass-lg focus:outline-none">
          <header className="flex items-center justify-between border-b border-white/55 px-5 py-3.5">
            <Dialog.Title className="font-display text-[15px] font-bold text-ink">New email</Dialog.Title>
            <Dialog.Close className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-white/70 hover:text-ink"><X className="size-4" /></Dialog.Close>
          </header>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="grid grid-cols-2 gap-2">
              <input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Recipient name" className={field} />
              <input value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="email@company.com" className={field} />
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={field} />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className={cn(field, 'flex-1 resize-none py-2.5')} />
          </div>
          <footer className="flex items-center justify-between gap-2 border-t border-white/55 p-4">
            <button type="button" onClick={draftWithAi} className="inline-flex h-10 items-center gap-2 rounded-xl bg-ai-soft px-3.5 text-[12.5px] font-bold text-ai hover:brightness-105">
              <Sparkles className="size-4" /> Draft with Kora
            </button>
            <button type="button" onClick={submit} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-ink px-4 text-[13px] font-bold text-white shadow-glass-soft hover:brightness-110">
              <Send className="size-4" /> Send
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const field = 'h-10 rounded-xl bg-white/70 px-3.5 text-[13px] text-ink placeholder:text-ink-muted ring-1 ring-white/70 focus:outline-none focus:ring-2 focus:ring-brand/30';
