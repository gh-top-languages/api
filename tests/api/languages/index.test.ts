import { describe, it, expect, vi, beforeEach   } from "vitest";
import type { VercelRequest, VercelResponse     } from "@vercel/node";
import { parseQueryParams                       } from "@gh-top-languages/lib/utils/params.js";
import type { ChartResult                       } from "@gh-top-languages/lib/charts/types.js";
import { generateChartData                      } from "@gh-top-languages/lib/charts/generate.js";
import { renderSvg                              } from "@gh-top-languages/lib/render/svg.js";
import { renderError                            } from "@gh-top-languages/lib/render/error.js";
import   handler                                  from "../../../api/languages/index.js";
import { fetchLanguageData, processLanguageData } from "../../../src/github.js";

vi.mock("@gh-top-languages/lib/utils/params.js");
vi.mock("@gh-top-languages/lib/charts/generate.js");
vi.mock("@gh-top-languages/lib/render/svg.js");
vi.mock("@gh-top-languages/lib/render/error.js");
vi.mock("../../../src/github.js");

describe("handler", () => {
  let req: VercelRequest;
  let res: VercelResponse;

  const mockTheme = {
    bg: "#ffffff",
    text: "#000000",
    gap: "#cccccc",
    colours: [] as string[]
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {} } as VercelRequest;
    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    } as unknown as VercelResponse;

    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(parseQueryParams).mockReturnValue({
      chartType:     "donut",
      chartTitle:    "Languages",
      width:         600,
      height:        400,
      count:         5,
      selectedTheme: mockTheme,
      gapType:       "gap",
      stroke:        false
    });
  });

  it("renders SVG successfully with valid data", async () => {
    const rawData = { JavaScript: 5000, Python: 3000 };
    const normalizedData = [
      { lang: "JavaScript", pct: 62.5 },
      { lang: "Python", pct: 37.5 }
    ];
    const chartData: ChartResult = {
      segments: '<path d="M 10 10..." />',
      legend: '<g><rect ... /><text>JS</text></g>',
      contentHeight: 0, contentWidth: 0,
    };
    const svgOutput = "<svg>chart</svg>";

    vi.mocked(fetchLanguageData).mockResolvedValue(rawData);
    vi.mocked(processLanguageData).mockReturnValue(normalizedData);
    vi.mocked(generateChartData).mockReturnValue(chartData);
    vi.mocked(renderSvg).mockReturnValue(svgOutput);

    await handler(req, res);

    expect(fetchLanguageData).toHaveBeenCalledWith(false);
    expect(processLanguageData).toHaveBeenCalledWith(rawData, 5);
    expect(generateChartData).toHaveBeenCalledWith(normalizedData, mockTheme, "donut", "gap", false);
    expect(renderSvg).toHaveBeenCalledWith(600, 400, "#ffffff", chartData, "Languages", "#000000");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(svgOutput);
  });

  it("renders error SVG when fetchLanguageData fails", async () => {
    const error = new Error("GitHub API error");
    const errorSvg = "<svg>error</svg>";

    vi.mocked(fetchLanguageData).mockRejectedValue(error);
    vi.mocked(renderError).mockReturnValue(errorSvg);

    await handler(req, res);

    expect(renderError).toHaveBeenCalledWith("GitHub API error", 600, 400, mockTheme);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.setHeader).toHaveBeenCalledWith("X-Chart-Error", "true");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(errorSvg);
  });

  it("renders error SVG when processLanguageData fails", async () => {
    const error = new Error("No language data available");
    const errorSvg = "<svg>error</svg>";

    vi.mocked(fetchLanguageData).mockResolvedValue({});
    vi.mocked(processLanguageData).mockImplementation(() => { throw error; });
    vi.mocked(renderError).mockReturnValue(errorSvg);

    await handler(req, res);

    expect(renderError).toHaveBeenCalledWith("No language data available", 600, 400, mockTheme);
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.setHeader).toHaveBeenCalledWith("X-Chart-Error", "true");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("throws error when error query param is set", async () => {
    req = { query: { error: "test error" } } as unknown as VercelRequest;
    const errorSvg = "<svg>error</svg>";
    vi.mocked(renderError).mockReturnValue(errorSvg);

    await handler(req, res);

    expect(renderError).toHaveBeenCalledWith("test error", 600, 400, mockTheme);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
