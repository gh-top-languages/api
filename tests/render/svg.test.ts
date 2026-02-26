import { describe, it, expect } from "vitest";
import { renderSvg } from "../../src/render/svg.js";

describe("renderSvg", () => {
  const segments = `<circle cx="200" r="100" fill="red"/>`;
  const legend = `<text x="50" y="50">Legend</text>`;

  it("renders complete SVG with all elements", () => {
    const result = renderSvg(600, 400, "#ffffff", segments, legend, "Test Title", "#000000");

    expect(result).toContain(`<svg width="600" height="400"`);
    expect(result).toContain(`fill="#ffffff"`);
    expect(result).toContain(segments);
    expect(result).toContain(legend);
    expect(result).toContain("Test Title");
  });

  it("omits title element when title is not provided", () => {
    const result = renderSvg(600, 400, "#ffffff", segments, legend, null, "#000000");

    expect(result).not.toContain(`text-anchor="middle"`);
    expect(result).toContain(segments);
    expect(result).toContain(legend);
  });
});
