import { createDonutSegments } from "./geometry.js";
import { DONUT_GEOMETRY } from "../constants/geometry.js";
import { createLegend } from "./legend.js";
import { LEGEND_SHIFT_THRESHOLD, LEGEND_STYLES } from "../constants/styles.js";
import type { Language, Theme, ChartResult } from "../types.js";

function calculateDonutCenter(
  width: number,
  isShifted: boolean
): number {
  const legendWidth = isShifted
    ? LEGEND_STYLES.COLUMN_WIDTH * 2
    : LEGEND_STYLES.WIDTH;

  const availableSpace = width - legendWidth - DONUT_GEOMETRY.MARGIN_RIGHT;
  return availableSpace / 2;
}

function calculateLegendStartX(
  chartCenterX: number,
  donutRadius: number
): number {
  return chartCenterX + donutRadius + DONUT_GEOMETRY.MARGIN_RIGHT;
}

export function generateDonutChart(
  normalizedLanguages: Language[],
  selectedTheme: Theme,
  width: number,
  stroke: boolean
): ChartResult {
  const isShifted = normalizedLanguages.length > LEGEND_SHIFT_THRESHOLD;
  const chartX = calculateDonutCenter(width, isShifted);
  const legendStartX = calculateLegendStartX(chartX, DONUT_GEOMETRY.OUTER_RADIUS);
  const useStroke = normalizedLanguages.length > 1 ? stroke : false;

  const segments = createDonutSegments(
    normalizedLanguages,
    chartX,
    DONUT_GEOMETRY,
    [...selectedTheme.colours],
    useStroke
  );

  const legend = createLegend(
    normalizedLanguages,
    isShifted,
    selectedTheme,
    legendStartX,
    useStroke
  );

  return { segments, legend };
}
