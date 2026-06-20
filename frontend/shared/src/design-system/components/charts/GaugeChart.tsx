import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { palette } from '../../tokens';

export interface GaugeChartProps {
  /** 0–100 */
  value: number;
  size?: number;
  /** Color of the active arc; defaults to brand */
  color?: string;
  /** Big label rendered inside (e.g. "82") */
  centerValue?: string | number;
  /** Small label under the big value (e.g. "Good") */
  centerLabel?: string;
}

export function GaugeChart({
  value,
  size = 200,
  color = palette.success,
  centerValue,
  centerLabel,
}: GaugeChartProps) {
  const option = useMemo(
    () => ({
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          radius: '90%',
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: palette.primary },
                  { offset: 1, color },
                ],
              },
            },
          },
          axisLine: {
            lineStyle: { width: 14, color: [[1, 'rgba(15, 23, 41, 0.06)']], roundCap: true },
          },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: { show: false },
          data: [{ value }],
        },
      ],
    }),
    [value, color],
  );

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <ReactECharts option={option} style={{ width: size, height: size }} opts={{ renderer: 'svg' }} notMerge />
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="flex flex-col leading-tight">
            {centerValue !== undefined ? (
              <span className="font-display text-4xl font-bold text-ink tabular">{centerValue}</span>
            ) : null}
            {centerLabel ? <span className="text-[11px] font-semibold text-success">{centerLabel}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
