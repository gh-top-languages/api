import { describe, it, expect, vi } from "vitest";
import { generateChartData } from "../../src/render/chart.js";
import { generateDonutChart } from "../../src/charts/donut.js";
import { THEMES } from "../../src/constants/themes.js";
import type { ChartType, ChartResult, Language, Theme } from "../../src/types.js";

type MockChartResult = ChartResult & {
  mockData: boolean;
  data: Language[];
  theme: Theme;
  width: number;
}

vi.mock("../../src/charts/donut.js", () => ({
  generateDonutChart: vi.fn((data, theme, width, _stroke) => ({
    segments: "",
    legend: "",
    mockData: true,
    data,
    theme,
    width
  } as MockChartResult))
}));

describe("generateChartData", () => {
  const data = [{ lang: "JavaScript", pct: 60 }];
  const theme = THEMES.default;
  const chartType = "donut";
  const width = 400;
  const stroke = false;

  it("should call donut generator when chartType is donut", () => {
    const result = generateChartData(data, theme, chartType, width, stroke) as MockChartResult;
    expect(generateDonutChart).toHaveBeenCalledWith(data, theme, width, stroke);
    expect(result.data).toBe(data);
    expect(result.theme).toBe(theme);
    expect(result.width).toBe(width);
  });

  it("defaults to donut generator when chartType is undefined", () => {
    generateChartData(data, theme, undefined as unknown as ChartType, width, stroke);
    expect(generateDonutChart).toHaveBeenCalledWith(data, theme, width, stroke);
  });

  it("defaults to donut generator for unrecognized chartType", () => {
    generateChartData(data, theme, "bigbadwolf" as ChartType, width, stroke);
    expect(generateDonutChart).toHaveBeenCalledWith(data, theme, width, stroke);
  });
});
