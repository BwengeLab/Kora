import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
const PlatformContext = createContext(null);
export function PlatformProvider({ platform, children, }) {
    return _jsx(PlatformContext.Provider, { value: platform, children: children });
}
export function usePlatform() {
    const ctx = useContext(PlatformContext);
    if (!ctx)
        throw new Error('usePlatform must be used inside <PlatformProvider>');
    return ctx;
}
