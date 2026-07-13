import { describe, it, expect } from "vitest";
import { processLanguageData  } from "../../src/github/process.js";

describe("processLanguageData", () => {
  it("calculates percentages correctly", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000 };
    const result = processLanguageData(data, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ lang: "JavaScript", pct: 50 });
    expect(result[1]).toEqual({ lang: "Python", pct: 30 });
    expect(result[2]).toEqual({ lang: "HTML", pct: 20 });
  });

  it("sorts by percentage descending", () => {
    const data = { HTML: 1000, JavaScript: 5000, Python: 3000 };
    const result = processLanguageData(data, 3);

    expect(result.map(l => l.lang)).toEqual(["JavaScript", "Python", "HTML"]);
  });

  it("limits to count", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000, CSS: 1000 };
    const result = processLanguageData(data, 2);

    expect(result).toHaveLength(2);
    expect(result.map(l => l.lang)).toEqual(["JavaScript", "Python"]);
  });

  it("does not renormalize percentages after slicing", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000 };
    const result = processLanguageData(data, 2);

    expect(result[0]).toEqual({ lang: "JavaScript", pct: 50 });
    expect(result[1]).toEqual({ lang: "Python", pct: 30 });

    const totalPct = result.reduce((sum, l) => sum + l.pct, 0);
    expect(totalPct).toBeCloseTo(80);
  });

  it("throws when no language data", () => {
    expect(() => processLanguageData({}, 5)).toThrow("No language data available");
  });
});
