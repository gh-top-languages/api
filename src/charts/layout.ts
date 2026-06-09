import { LEGEND_SHIFT_THRESHOLD, LEGEND_STYLES } from "../constants/styles.js";
import { DONUT_GEOMETRY } from "../constants/geometry.js";

export function resolveLayout(count: number, stroke: boolean) {
  return {
    isShifted: count > LEGEND_SHIFT_THRESHOLD,
    useStroke: count > 1 ? stroke : false
  };
}

export function calculateChartCenter(width: number, isShifted: boolean): number {
  const legendWidth = isShifted
    ? LEGEND_STYLES.COLUMN_WIDTH * 2
    : LEGEND_STYLES.WIDTH;
  return (width - legendWidth - DONUT_GEOMETRY.MARGIN_RIGHT) / 2;
}

export function calculateLegendStartX(chartCenterX: number, radius: number): number {
  return chartCenterX + radius + DONUT_GEOMETRY.MARGIN_RIGHT;
}
