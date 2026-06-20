import { AppProviders } from './providers';
import { AppRouter } from '../routing/router';
import type { Platform } from '../platform/types';

export interface AppProps {
  platform: Platform;
  apiBaseUrl: string;
}

// Top-level app: providers + router. Actual UI (layout, sidebar, pages) is
// rendered downstream by the blueprint renderer + design system, which are
// built once the UI/UX descriptions are provided.
export function App({ platform, apiBaseUrl }: AppProps) {
  return (
    <AppProviders platform={platform} apiBaseUrl={apiBaseUrl}>
      <AppRouter />
    </AppProviders>
  );
}
