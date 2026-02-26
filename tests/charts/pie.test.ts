import { describe, it, expect, vi } from "vitest";
import { generatePieChart } from "../../src/charts/pie.js";
import { createDonutSegments } from "../../src/charts/geometry.js";
import { createLegend } from "../../src/charts/legend.js";
import { LEGEND_SHIFT_THRESHOLD } from "../../src/constants/styles.js";

vi.mock("../../src/charts/geometry.js", () => ({
  createDonutSegments: vi.fn(() => `<path d="mockSegment"/>`)
}));

vi.mock("../../src/charts/legend.js", () => ({
  createLegend: vi.fn(() => `<rect/><text>mockLegend</text>`)
}));

const mockCreateDonutSegments = vi.mocked(createDonutSegments);
const mockCreateLegend = vi.mocked(createLegend);

describe("generatePieChart", () => {
  const theme = { colours: ["#f00", "#0f0"], text: "#333", bg: "#fff" };

  it("returns segments and legend", () => {
    const langs = [{ lang: "JS", pct: 100 }];
    const result = generatePieChart(langs, theme, 800, false);
    expect(result).toHaveProperty("segments");
    expect(result).toHaveProperty("legend");
    expect(mockCreateDonutSegments).toHaveBeenCalled();
    expect(mockCreateLegend).toHaveBeenCalled();
  });

  it("passes INNER_RADIUS: 0 for filled pie", () => {
    const langs = [{ lang: "Python", pct: 100 }];
    generatePieChart(langs, theme, 800, false);
    const call = mockCreateDonutSegments.mock.calls.at(-1)!;
    const geometry = call[2];
    expect(geometry.INNER_RADIUS).toBe(0);
  });

  it("shifts legend when above threshold", () => {
    const langs = Array.from({ length: LEGEND_SHIFT_THRESHOLD + 1 }, (_, i) => ({
      lang: `L${i}`, pct: 100 / (LEGEND_SHIFT_THRESHOLD + 1)
    }));
    generatePieChart(langs, theme, 800, false);
    const legendCall = mockCreateLegend.mock.calls.at(-1)!;
    expect(legendCall[1]).toBe(true);
  });

  it("calculates positions based on width", () => {
    const langs = [{ lang: "Rust", pct: 100 }];
    generatePieChart(langs, theme, 1000, false);
    const segmentCall = mockCreateDonutSegments.mock.calls.at(-1)!;
    const legendCall = mockCreateLegend.mock.calls.at(-1)!;
    expect(typeof segmentCall[1]).toBe("number");
    expect(typeof legendCall[3]).toBe("number");
  });
});
