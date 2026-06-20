import type {
  FileOpenOptions,
  FileSaveOptions,
  KeyValueStore,
  NotifyOptions,
  Platform,
} from '@shared/platform/types';

const store: KeyValueStore = {
  async get(key) {
    return localStorage.getItem(key);
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async remove(key) {
    localStorage.removeItem(key);
  },
};

async function notify(opts: NotifyOptions): Promise<void> {
  // Browser Notification API is opt-in and design-system-driven toasts will
  // supersede this once the DS lands. Until then: log + best-effort.
  console.info(`[notify:${opts.level ?? 'info'}]`, opts.title ?? '', opts.body);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(opts.title ?? 'Kora', { body: opts.body });
  }
}

async function openExternal(url: string): Promise<void> {
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function pickFiles(opts: FileOpenOptions = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (opts.accept?.length) input.accept = opts.accept.join(',');
    if (opts.multiple) input.multiple = true;
    input.onchange = () => resolve(input.files ? Array.from(input.files) : []);
    input.click();
  });
}

async function saveFile(opts: FileSaveOptions): Promise<void> {
  const blob =
    opts.data instanceof Blob
      ? opts.data
      : new Blob([opts.data as BlobPart], { type: opts.mimeType ?? 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.suggestedName ?? 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const webPlatform: Platform = {
  name: 'web',
  notify,
  openExternal,
  pickFiles,
  saveFile,
  store,
};
