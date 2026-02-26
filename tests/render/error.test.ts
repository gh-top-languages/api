import { describe, it, expect } from "vitest";
import { renderError } from "../../src/render/error.js";
import { THEMES } from "../../src/constants/themes.js";
import type { Theme } from "../../src/types.js";

describe("renderError", () => {
  it("renders error SVG with message", () => {
    const result = renderError("Test error", 400, 300);
    expect(result).toContain(`<svg width="400" height="300"`);
    expect(result).toContain("Error: Test error");
  });

  it("uses custom theme background when provided", () => {
    const theme = { bg: "#123456" } as Theme;
    const result = renderError("Error", 400, 300, theme);
    expect(result).toContain(`fill="#123456"`);
  });

  it("falls back to default theme when no theme provided", () => {
    const result = renderError("Error", 400, 300);
    expect(result).toContain(`fill="${THEMES.default.bg}"`);
  });
});
