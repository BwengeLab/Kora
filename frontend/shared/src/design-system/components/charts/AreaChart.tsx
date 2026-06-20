import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { palette } from '../../tokens';

export interface AreaSeries {
  name: string;
  color: string;
  data: number[];
}

export interface AreaChartProps {
  xLabels: string[];
  series: AreaSeries[];
  height?: number;
  showLegend?: boolean;
  /** Render a vertical guide line + tooltip on hover (the reference shows one) */
  guideOnHover?: boolean;
}

// Soft, multi-series area chart with no axis chrome — matches the reference's
// Cash Flow Overview look. ECharts under the hood for the smooth gradient fills.
export function AreaChart({ xLabels, series, height = 220, showLegend = false, guideOnHover = true }: AreaChartProps) {
  const option = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 12, bottom: 24, containLabel: true },
      tooltip: guideOnHover
        ? {
            trigger: 'axis',
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: 'rgba(255,255,255,0.8)',
            borderWidth: 1,
            textStyle: { color: palette.ink, fontSize: 12, fontWeight: 600 },
            extraCssText: 'box-shadow: 0 8px 32px rgba(31,38,135,0.12); border-radius: 12px;',
            axisPointer: {
              type: 'line',
              lineStyle: { color: 'rgba(67,97,238,0.35)', width: 1, type: 'solid' },
            },
          }
        : { show: false },
      legend: showLegend ? { bottom: 0, textStyle: { color: palette.inkSoft, fontSize: 12 } } : { show: false },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: palette.inkMuted, fontSize: 11, fontWeight: 500 },
      },
      yAxis: {
        type: 'value',
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)', type: 'dashed' } },
        axisLabel: {
          color: palette.inkMuted,
          fontSize: 11,
          formatter: (v: number) => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${(v / 1e3).toFixed(0)}K`),
        },
      },
      series: series.map((s) => ({
        name: s.name,
        type: 'line',
        smooth: 0.55,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 8,
        emphasis: { focus: 'series', itemStyle: { borderColor: 'white', borderWidth: 3 } },
        lineStyle: { width: 2.5, color: s.color },
        itemStyle: { color: s.color, borderColor: 'white', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: hexA(s.color, 0.35) },
              { offset: 1, color: hexA(s.color, 0.02) },
            ],
          },
        },
        data: s.data,
      })),
    }),
    [xLabels, series, showLegend, guideOnHover],
  );

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
}

function hexA(hex: string, a: number): string {
  // #rrggbb → rgba(r,g,b,a)
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${a})`;
}
