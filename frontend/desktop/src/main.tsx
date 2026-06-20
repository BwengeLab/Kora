import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@shared/app/App';
import { desktopPlatform } from './platform.desktop';
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/plus-jakarta-sans/index.css';
import '@shared/styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

createRoot(root).render(
  <StrictMode>
    <App platform={desktopPlatform} apiBaseUrl={apiBaseUrl} />
  </StrictMode>,
);
