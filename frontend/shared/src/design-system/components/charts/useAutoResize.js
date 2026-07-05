import { useEffect, useRef } from 'react';
// ECharts only auto-resizes on window resize. When the container changes width
// for any other reason (sidebar collapse/expand, grid reflow, card growing to
// equal height), the canvas would otherwise keep its old size and overflow or
// leave a gap. This hook observes the container and resizes the chart.
export function useAutoResize() {
    const chartRef = useRef(null);
    const containerRef = useRef(null);
    useEffect(() => {
        const el = containerRef.current;
        if (!el)
            return;
        const ro = new ResizeObserver(() => {
            chartRef.current?.getEchartsInstance().resize();
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return { chartRef, containerRef };
}
