import { jsx as _jsx } from "react/jsx-runtime";
import { AppProviders } from './providers';
import { AppRouter } from '../routing/router';
// Top-level app: providers + router. Actual UI (layout, sidebar, pages) is
// rendered downstream by the blueprint renderer + design system, which are
// built once the UI/UX descriptions are provided.
export function App({ platform, apiBaseUrl }) {
    return (_jsx(AppProviders, { platform: platform, apiBaseUrl: apiBaseUrl, children: _jsx(AppRouter, {}) }));
}
