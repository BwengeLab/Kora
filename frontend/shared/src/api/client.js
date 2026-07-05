import { createConnectTransport } from '@connectrpc/connect-web';
import { createPromiseClient } from '@connectrpc/connect';
let transportRef = null;
let apiBaseUrlRef = '';
export function initApi(config) {
    const opts = {
        baseUrl: config.baseUrl,
        useBinaryFormat: config.useBinaryFormat ?? false,
    };
    if (config.fetch)
        opts.fetch = config.fetch;
    transportRef = createConnectTransport(opts);
    apiBaseUrlRef = config.baseUrl;
    return transportRef;
}
export function getTransport() {
    if (!transportRef) {
        throw new Error('API transport not initialized. Call initApi(config) at app bootstrap.');
    }
    return transportRef;
}
// Typed helper: pass a generated service (e.g. `LedgerService` from api/gen) and
// get a ready-to-use Connect client. Once `pnpm proto:gen` has run, callers do:
//   import { LedgerService } from '@shared/api/gen/ledger/...';
//   const ledger = makeClient(LedgerService);
export function makeClient(service) {
    return createPromiseClient(service, getTransport());
}
export function getApiBaseUrl() {
    if (!apiBaseUrlRef) {
        throw new Error('API base URL not initialized. Call initApi(config) at app bootstrap.');
    }
    return apiBaseUrlRef;
}
