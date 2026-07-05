import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from '@tanstack/react-router';
// Thin layout so the platform child routes render inside the persistent shell.
// The platform sidebar nav is already composed per the Super Admin blueprint.
export function PlatformLayout() {
    return _jsx(Outlet, {});
}
