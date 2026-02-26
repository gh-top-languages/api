import { describe, it, expect } from "vitest";
import { createLegend } from "../../src/charts/legend.js";
import { LEGEND_STYLES } from "../../src/constants/styles.js";
import type { Theme } from "../../src/types.js";

const theme: Theme = { colours: ["#f00", "#0f0", "#00f"], text: "#333", bg: "#fff" };

describe("createLegend", () => {
  it("single-column layout positions correctly", () => {
    const langs = [
      { lang: "JavaScript", pct: 60 },
      { lang: "Python", pct: 40 }
    ];
    const result = createLegend(langs, false, theme, 300, false);
    expect(result).toContain(`x="300"`);
    expect(result).toContain(`y="${LEGEND_STYLES.START_Y}"`);
    expect(result).toContain(`y="${LEGEND_STYLES.START_Y + LEGEND_STYLES.ROW_HEIGHT}"`);
  });

  it("two-column layout when isShifted", () => {
    const langs = Array.from({ length: 8 }, (_, i) => ({
      lang: `Lang${i}`,
      pct: 12.5
    }));
    const result = createLegend(langs, true, theme, 300, false);
    expect(result).toContain(`x="300`);
    expect(result).toContain(`x="${300 + LEGEND_STYLES.COLUMN_WIDTH}"`);
  });

  it("formats percentages to one decimal", () => {
    const langs = [{ lang: "Rust", pct: 33.333 }];
    const result = createLegend(langs, false, theme, 300, false);
    
    expect(result).toContain("33.3%");
    expect(result).not.toContain("33.333");
  });

  it("adds stroke attributes when stroke is enabled", () => {
    const langs = [{ lang: "C#", pct: 100 }];
    const result = createLegend(langs, false, theme, 300, true);

    expect(result).toContain(`stroke="#000"`);
    expect(result).toContain(`stroke-width="0.5"`);
  });

  it("generates rect and text for each language", () => {
    const langs = [
      { lang: "C#", pct: 50 },
      { lang: "C++", pct: 50 }
    ];
    const result = createLegend(langs, false, theme, 300, false);
    expect(result.match(/<rect /g)!.length).toBe(2);
    expect(result.match(/<text /g)!.length).toBe(2);
    expect(result).toContain("C# 50.0%");
    expect(result).toContain("C++ 50.0%");
  });

  it("applies theme colours correctly", () => {
    const langs = [{ lang: "Java", pct: 100 }];
    const result = createLegend(langs, false, theme, 300, false);
    expect(result).toContain(`fill="#f00"`);
    expect(result).toContain(`fill="${theme.text}"`);
  });
});
