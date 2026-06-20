import { createConnectTransport } from '@connectrpc/connect-web';
import { createPromiseClient, type PromiseClient, type Transport } from '@connectrpc/connect';
import type { ServiceType } from '@bufbuild/protobuf';

export interface ApiConfig {
  baseUrl: string;
  useBinaryFormat?: boolean;
  fetch?: typeof fetch;
}

let transportRef: Transport | null = null;

export function initApi(config: ApiConfig): Transport {
  const opts: Parameters<typeof createConnectTransport>[0] = {
    baseUrl: config.baseUrl,
    useBinaryFormat: config.useBinaryFormat ?? false,
  };
  if (config.fetch) opts.fetch = config.fetch;
  transportRef = createConnectTransport(opts);
  return transportRef;
}

export function getTransport(): Transport {
  if (!transportRef) {
    throw new Error('API transport not initialized. Call initApi(config) at app bootstrap.');
  }
  return transportRef;
}

// Typed helper: pass a generated service (e.g. `LedgerService` from api/gen) and
// get a ready-to-use Connect client. Once `pnpm proto:gen` has run, callers do:
//   import { LedgerService } from '@shared/api/gen/ledger/...';
//   const ledger = makeClient(LedgerService);
export function makeClient<T extends ServiceType>(service: T): PromiseClient<T> {
  return createPromiseClient(service, getTransport());
}
