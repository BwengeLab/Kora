import { jsx as _jsx } from "react/jsx-runtime";
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { StatusChip } from './StatusChip';
const config = {
    low: { tone: 'success', icon: _jsx(ShieldCheck, {}), label: 'Low risk' },
    medium: { tone: 'warning', icon: _jsx(AlertTriangle, {}), label: 'Medium risk' },
    high: { tone: 'danger', icon: _jsx(ShieldAlert, {}), label: 'High risk' },
};
export function RiskFlag({ level, label }) {
    const c = config[level];
    return (_jsx(StatusChip, { tone: c.tone, icon: c.icon, children: label ?? c.label }));
}
