import { AppProviders } from './providers';
import { AppRouter } from '../routing/router';
import type { Platform } from '../platform/types';
import { useSession } from '../auth/hooks';
import { EnterpriseAuthGate } from '../modules/auth/EnterpriseAuthGate';

export interface AppProps {
  platform: Platform;
  apiBaseUrl: string;
}

// Top-level app: providers + router. Actual UI (layout, sidebar, pages) is
// rendered downstream by the blueprint renderer + design system, which are
// built once the UI/UX descriptions are provided.
export function App({ platform, apiBaseUrl }: AppProps) {
  const session = useSession();
  return (
    <AppProviders platform={platform} apiBaseUrl={apiBaseUrl}>
      {session ? <AppRouter /> : <EnterpriseAuthGate apiBaseUrl={apiBaseUrl} platform={platform} />}
    </AppProviders>
  );
}
