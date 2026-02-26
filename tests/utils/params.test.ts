import { describe, it, expect } from "vitest";
import { parseQueryParams } from "../../src/utils/params.js"

import { DEFAULT_CONFIG, MAX_COUNT } from "../../src/constants/config.js";
import { THEMES } from "../../src/constants/themes.js";

describe("parseQueryParams", () => {
  it("uses defaults when query is empty", () => {
    const params = parseQueryParams({});

    expect(params.chartType).toBe("donut");
    expect(params.chartTitle).toBe(DEFAULT_CONFIG.TITLE);
    expect(params.count).toBe(DEFAULT_CONFIG.COUNT);
    
    expect(params.selectedTheme.bg).toBe(THEMES.default.bg);
    expect(params.selectedTheme.text).toBe(THEMES.default.text);
    expect(params.selectedTheme.colours).toEqual(THEMES.default.colours);

    expect(params.width).toBeGreaterThanOrEqual(DEFAULT_CONFIG.MIN_WIDTH);
    expect(params.height).toBe(DEFAULT_CONFIG.HEIGHT);
    expect(params.useTestData).toBe(false);
  });

  it("accepts valid chart type", () => {
    const params = parseQueryParams({ type: "donut" });
    expect(params.chartType).toBe("donut");
  })

  it("falls back to donut when type is invalid", () => {
    const params = parseQueryParams({ type: "nope" });
    expect(params.chartType).toBe("donut");
  });

  it("honours hide_title=true and blanks title", () => {
    const params = parseQueryParams({ hide_title: "true", title: "Hello" });
    expect(params.chartTitle).toBe("");
  });

  it("sanitizes title when provided", () => {
    const params = parseQueryParams({ title: `<scripts>alert("x")</script>` });
    expect(params.chartTitle).toBe("&lt;scripts&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("clamps count between 1 and MAX_COUNT", () => {
    expect(parseQueryParams({ count: "0" }).count).toBe(1);
    expect(parseQueryParams({ count: "-5" }).count).toBe(1);
    expect(parseQueryParams({ count: String(MAX_COUNT + 100) }).count).toBe(MAX_COUNT);
  });

  it("applies theme by name and allows overriding text/bg", () => {
    const themeKey = Object.keys(THEMES).find((k) => k !== "default") ?? "default";

    const params = parseQueryParams({
      theme: themeKey,
      text: "#111111",
      bg: "#ffffff",
    });

    expect(params.selectedTheme.text).toBe("#111111");
    expect(params.selectedTheme.bg).toBe("#ffffff");
    expect(params.selectedTheme.colours).toEqual(THEMES[themeKey as keyof typeof THEMES]!.colours);
  });

  it("if bg matches a theme name, use that theme's bg", () => {
    const bgThemeKey = Object.keys(THEMES)[0]!;
    const params = parseQueryParams({ bg: bgThemeKey });
    expect(params.selectedTheme.bg).toBe(THEMES[bgThemeKey as keyof typeof THEMES]!.bg);
  });

  it("overrides colours via c1..cMAX_COUNT", () => {
    const params = parseQueryParams({
      c1: "#abc123",
      c2: "def456",
    });

    expect(params.selectedTheme.colours[0]).toBe("#abc123");
    expect(params.selectedTheme.colours[1]).toBe("#def456");
  });

  it("enforces MIN_WIDTH and supports explicit width/height", () => {
    const small = parseQueryParams({ width: "1" });
    expect(small.width).toBe(DEFAULT_CONFIG.MIN_WIDTH);

    const exact = parseQueryParams({ width: String(DEFAULT_CONFIG.MIN_WIDTH + 10), height: "777" });
    expect(exact.width).toBe(DEFAULT_CONFIG.MIN_WIDTH + 10);
    expect(exact.height).toBe(777);
  });

  it("falls back to default when count/width are non-numeric", () => {
    const params = parseQueryParams({ count: "abc", width: "xyz" });
    expect(params.count).toBe(DEFAULT_CONFIG.COUNT);
    expect(params.width).toBe(DEFAULT_CONFIG.WIDTH);
  })

  it("enables test mode when test=true", () => {
    expect(parseQueryParams({ test: "true" }).useTestData).toBe(true);
    expect(parseQueryParams({ test: "false" }).useTestData).toBe(false);
  });
});
