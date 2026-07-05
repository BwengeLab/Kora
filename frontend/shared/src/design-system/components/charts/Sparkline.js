import { jsx as _jsx } from "react/jsx-runtime";
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
// Tiny inline trend line; no axes, no tooltip — pure shape cue.
export function Sparkline({ data, color, width = 80, height = 28 }) {
    const option = useMemo(() => ({
        grid: { left: 0, right: 0, top: 2, bottom: 2 },
        xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => i) },
        yAxis: { type: 'value', show: false, scale: true },
        series: [
            {
                type: 'line',
                smooth: 0.6,
                symbol: 'none',
                lineStyle: { width: 2, color },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: hexA(color, 0.35) },
                            { offset: 1, color: hexA(color, 0) },
                        ],
                    },
                },
                data,
            },
        ],
    }), [data, color]);
    return _jsx(ReactECharts, { option: option, style: { width, height }, opts: { renderer: 'svg' }, notMerge: true });
}
function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return `rgba(${r},${g},${b},${a})`;
}
