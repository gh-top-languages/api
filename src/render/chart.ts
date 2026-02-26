import { generateDonutChart } from "../charts/donut.js";
import { generatePieChart } from "../charts/pie.js";
import type { Language, Theme, ChartType, ChartResult } from "../types.js";

const CHART_GENERATORS: Record<ChartType, (
  data: Language[],
  theme: Theme,
  width: number,
  stroke: boolean
) => ChartResult> = {
  donut: generateDonutChart,
  pie: generatePieChart,
}

export function generateChartData(
  data: Language[],
  theme: Theme,
  chartType: ChartType,
  width: number,
  stroke: boolean
): ChartResult {
  const generator = CHART_GENERATORS[chartType] || CHART_GENERATORS.donut;
  return generator(data, theme, width, stroke);
}
