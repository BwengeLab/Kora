import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertOctagon, FileX2, Flag, ShieldAlert } from 'lucide-react';
import { GlassSurface, cn } from '../../design-system';
import { seedRiskStats } from '../../seed/auditorHome';
export function RiskStatCards({ riskStats = seedRiskStats }) {
    const s = riskStats;
    const cards = [
        { label: 'Risk flags', sub: 'open · all severities', value: s.riskFlags, icon: Flag, tone: 'bg-warning-soft text-warning' },
        { label: 'SoD violations', sub: 'segregation of duties', value: s.sodViolations, icon: ShieldAlert, tone: 'bg-danger-soft text-danger' },
        { label: 'Suspicious activity', sub: 'agent-flagged', value: s.suspicious, icon: AlertOctagon, tone: 'bg-danger-soft text-danger' },
        { label: 'Missing documents', sub: 'unsupported entries', value: s.missingDocs, icon: FileX2, tone: 'bg-info-soft text-info' },
    ];
    return (_jsx("div", { className: "grid grid-cols-2 gap-4", children: cards.map((c) => (_jsxs(GlassSurface, { tone: "strong", className: "flex flex-col gap-2 p-5", children: [_jsx("span", { className: cn('grid size-10 place-items-center rounded-2xl', c.tone), children: _jsx(c.icon, { className: "size-[18px]" }) }), _jsx("span", { className: "font-display text-3xl font-bold leading-none text-ink tabular", children: c.value }), _jsx("span", { className: "text-[12.5px] font-semibold text-ink", children: c.label }), _jsx("span", { className: "text-[10.5px] font-medium text-ink-muted", children: c.sub })] }, c.label))) }));
}
