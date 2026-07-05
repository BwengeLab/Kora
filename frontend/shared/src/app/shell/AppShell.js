import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CopilotPanel } from './CopilotPanel';
import { DocViewer } from './DocViewer';
import { Sidebar } from './Sidebar';
import { Toaster } from './Toaster';
import { ToolsLauncher } from './ToolsLauncher';
import { TopBar } from './TopBar';
// Persistent chrome wrapping every routed page. Sidebar + (TopBar + main).
// Uses h-dvh + w-full (not w-screen, which adds the scrollbar width and causes
// a horizontal overflow). The content column owns all horizontal padding so
// pages fill the available width.
export function AppShell({ children }) {
    // The root carries CSS `zoom: var(--app-zoom)`. Viewport units (dvh/vw) are
    // NOT pre-divided by zoom, so a plain `h-dvh` would leave a gap. Dividing the
    // height/width by the zoom factor makes the rendered box fill the window.
    return (_jsxs("div", { className: "flex w-full overflow-hidden", style: {
            height: 'calc(100dvh / var(--app-zoom, 1))',
            width: 'calc(100vw / var(--app-zoom, 1))',
        }, children: [_jsx("div", { className: "pl-3", children: _jsx(Sidebar, {}) }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col overflow-hidden", children: [_jsx(TopBar, {}), _jsx("main", { className: "scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden pb-10", children: children })] }), _jsx(Toaster, {}), _jsx(DocViewer, {}), _jsx(CopilotPanel, {}), _jsx(ToolsLauncher, {})] }));
}
