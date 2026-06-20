// The Platform interface: the ONLY door from shared code to browser/OS APIs.
// Web and desktop shells each provide an implementation.

export type NotifyLevel = 'info' | 'success' | 'warning' | 'error';

export interface NotifyOptions {
  level?: NotifyLevel;
  title?: string;
  body: string;
}

export interface FileOpenOptions {
  accept?: string[];
  multiple?: boolean;
}

export interface FileSaveOptions {
  suggestedName?: string;
  mimeType?: string;
  data: Blob | Uint8Array | string;
}

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface Platform {
  readonly name: 'web' | 'desktop';
  notify(opts: NotifyOptions): Promise<void>;
  openExternal(url: string): Promise<void>;
  pickFiles(opts?: FileOpenOptions): Promise<File[]>;
  saveFile(opts: FileSaveOptions): Promise<void>;
  store: KeyValueStore;
}
