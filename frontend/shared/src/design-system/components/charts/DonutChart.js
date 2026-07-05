import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { palette } from '../../tokens';
export function DonutChart({ slices, centerLabel, centerSub, size = 180 }) {
    const option = useMemo(() => ({
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: 'rgba(255,255,255,0.8)',
            borderWidth: 1,
            textStyle: { color: palette.ink, fontSize: 12, fontWeight: 600 },
            extraCssText: 'box-shadow: 0 8px 32px rgba(31,38,135,0.12); border-radius: 12px;',
            formatter: (p) => `${p.name}<br/><b>${p.value.toLocaleString()}</b> · ${p.percent}%`,
        },
        legend: { show: false },
        series: [
            {
                type: 'pie',
                radius: ['65%', '92%'],
                padAngle: 3,
                itemStyle: { borderRadius: 12, borderColor: 'white', borderWidth: 4 },
                label: { show: false },
                labelLine: { show: false },
                emphasis: { scale: true, scaleSize: 4 },
                data: slices.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
            },
        ],
    }), [slices]);
    return (_jsxs("div", { className: "relative grid place-items-center", style: { width: size, height: size }, children: [_jsx(ReactECharts, { option: option, style: { width: size, height: size }, opts: { renderer: 'svg' }, notMerge: true }), (centerLabel || centerSub) && (_jsx("div", { className: "pointer-events-none absolute inset-0 grid place-items-center text-center", children: _jsxs("div", { className: "flex flex-col leading-tight", children: [centerLabel ? (_jsx("span", { className: "font-display text-2xl font-bold text-ink tabular", children: centerLabel })) : null, centerSub ? _jsx("span", { className: "text-[11px] font-medium text-ink-muted", children: centerSub }) : null] }) }))] }));
}
