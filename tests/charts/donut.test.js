import { describe, it, expect, vi } from "vitest";
import { generateDonutChart } from "../../src/charts/donut.js";
import { createDonutSegments } from "../../src/charts/geometry.js";
import { createLegend } from "../../src/charts/legend.js";
import { LEGEND_SHIFT_THRESHOLD } from "../../src/constants/styles.js";

vi.mock("../../src/charts/geometry.js", () => ({
  createDonutSegments: vi.fn(() => `<path d="mockSegment"/>`)
}));

vi.mock("../../src/charts/legend.js", () => ({
  createLegend: vi.fn(() => "<rect/><text>mockLegend</text>")
}));

describe("generateDonutChart", () => {
  const theme = { colours: ["#f00", "#0f0"], text: "#333" };

  it("returns segments and legend", () => {
    const langs = [{ lang: "JS", pct: 100 }];
    const result = generateDonutChart(langs, theme, 800);
    expect(result).toHaveProperty("segments");
    expect(result).toHaveProperty("legend");
    expect(createDonutSegments).toHaveBeenCalled();
    expect(createLegend).toHaveBeenCalled();
  });

  it("passes isShifted=false when below threshold", () => {
    const langs = Array.from({ length: LEGEND_SHIFT_THRESHOLD }, (_, i) => ({
      lang: `L${i}`, pct: 100 / LEGEND_SHIFT_THRESHOLD
    }));

    generateDonutChart(langs, theme, 800);
    const legendCall = createLegend.mock.calls[createLegend.mock.calls.length - 1];
    expect(legendCall[1]).toBe(false);
  });

  it("passes isShifted=true when above threshold", () => {
    const langs = Array.from({ length: LEGEND_SHIFT_THRESHOLD + 1 }, (_, i) => ({
      lang: `L${i}`, pct: 100 / (LEGEND_SHIFT_THRESHOLD + 1)
    }));

    generateDonutChart(langs, theme, 800);
    const legendCall = createLegend.mock.calls[createLegend.mock.calls.length - 1];
    expect(legendCall[1]).toBe(true);
  });

  it("calculates positions based on width", () => {
    const langs = [{ lang: "Python", pct: 100 }];
    generateDonutChart(langs, theme, 1000);
    const segmentCall = createDonutSegments.mock.calls[createDonutSegments.mock.calls.length - 1];
    const legendCall = createLegend.mock.calls[createLegend.mock.calls.length - 1];
    expect(typeof segmentCall[1]).toBe("number");
    expect(typeof legendCall[3]).toBe("number");
  });

  it("passes theme to both segments and legend", () => {
    const langs = [{ lang: "HTML", pct: 100 }];
    generateDonutChart(langs, theme, 800);
    const segmentsCall = createDonutSegments.mock.calls[createDonutSegments.mock.calls.length - 1];
    const legendCall = createLegend.mock.calls[createLegend.mock.calls.length - 1];
    expect(segmentsCall[3]).toEqual(theme.colours);
    expect(legendCall[2]).toBe(theme);
  });
});
