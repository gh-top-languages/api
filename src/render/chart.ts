import { generateDonutChart } from "../charts/donut";
import { generatePieChart } from "../charts/pie";
import { Language, Theme, ChartType, ChartResult } from "../types";

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
