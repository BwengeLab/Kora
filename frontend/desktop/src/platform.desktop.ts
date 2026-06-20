import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';
import { LazyStore } from '@tauri-apps/plugin-store';
import type {
  FileOpenOptions,
  FileSaveOptions,
  KeyValueStore,
  NotifyOptions,
  Platform,
} from '@shared/platform/types';

const tauriStore = new LazyStore('kora.store.json');

const store: KeyValueStore = {
  async get(key) {
    const v = await tauriStore.get<string>(key);
    return v ?? null;
  },
  async set(key, value) {
    await tauriStore.set(key, value);
    await tauriStore.save();
  },
  async remove(key) {
    await tauriStore.delete(key);
    await tauriStore.save();
  },
};

async function ensureNotificationPermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const res = await requestPermission();
    granted = res === 'granted';
  }
  return granted;
}

async function notify(opts: NotifyOptions): Promise<void> {
  if (!(await ensureNotificationPermission())) return;
  sendNotification({ title: opts.title ?? 'Kora', body: opts.body });
}

async function openExternal(url: string): Promise<void> {
  await openUrl(url);
}

async function pickFiles(opts: FileOpenOptions = {}): Promise<File[]> {
  const dialogOpts: Parameters<typeof openDialog>[0] = { multiple: opts.multiple ?? false };
  if (opts.accept?.length) {
    dialogOpts.filters = [
      { name: 'Files', extensions: opts.accept.map((a) => a.replace(/^\./, '')) },
    ];
  }
  const selected = await openDialog(dialogOpts);
  if (!selected) return [];
  const paths = Array.isArray(selected) ? selected : [selected];
  const files: File[] = [];
  for (const path of paths) {
    const bytes = await readFile(path);
    const name = path.split(/[\\/]/).pop() ?? 'file';
    files.push(new File([bytes], name));
  }
  return files;
}

async function saveFile(opts: FileSaveOptions): Promise<void> {
  const saveOpts: Parameters<typeof saveDialog>[0] = {};
  if (opts.suggestedName) saveOpts.defaultPath = opts.suggestedName;
  const target = await saveDialog(saveOpts);
  if (!target) return;
  const bytes =
    opts.data instanceof Blob
      ? new Uint8Array(await opts.data.arrayBuffer())
      : typeof opts.data === 'string'
        ? new TextEncoder().encode(opts.data)
        : opts.data;
  await writeFile(target, bytes);
}

export const desktopPlatform: Platform = {
  name: 'desktop',
  notify,
  openExternal,
  pickFiles,
  saveFile,
  store,
};
