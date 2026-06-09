import { describe, it, expect, vi, beforeEach   } from "vitest";
import type { VercelRequest, VercelResponse     } from "@vercel/node";
import type { ChartResult                       } from "../../../src/types.js";
import   handler                                  from "../../../api/languages/index.js";
import { parseQueryParams                       } from "../../../src/utils/params.js";
import { fetchLanguageData, processLanguageData } from "../../../src/services/github.js";
import { generateChartData                      } from "../../../src/render/chart.js";
import { renderSvg                              } from "../../../src/render/svg.js";
import { renderError                            } from "../../../src/render/error.js";

vi.mock("../../../src/utils/params.js");
vi.mock("../../../src/services/github.js");
vi.mock("../../../src/render/chart.js");
vi.mock("../../../src/render/svg.js");
vi.mock("../../../src/render/error.js");

describe("handler", () => {
  let req: VercelRequest;
  let res: VercelResponse;

  const mockTheme = { 
    bg: "#ffffff", 
    text: "#000000", 
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
      stroke:        false,
      useTestData:   false,
      errorTest:     ''
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
      legend: '<g><rect ... /><text>JS</text></g>'
    };
    const svgOutput = "<svg>chart</svg>";

    vi.mocked(fetchLanguageData).mockResolvedValue(rawData);
    vi.mocked(processLanguageData).mockReturnValue(normalizedData);
    vi.mocked(generateChartData).mockReturnValue(chartData);
    vi.mocked(renderSvg).mockReturnValue(svgOutput);

    await handler(req, res);

    expect(fetchLanguageData).toHaveBeenCalledWith(false);
    expect(processLanguageData).toHaveBeenCalledWith(rawData, 5);
    expect(generateChartData).toHaveBeenCalledWith(normalizedData, mockTheme, "donut", 600, false);
    expect(renderSvg).toHaveBeenCalledWith(600, 400, "#ffffff", chartData.segments, chartData.legend, "Languages", "#000000");
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

  it("throws error when errorTest param is set", async () => {
    vi.mocked(parseQueryParams).mockReturnValue({
      chartType: "donut", chartTitle: "Languages",
      width: 600, height: 400, count: 5,
      selectedTheme: mockTheme, stroke: false,
      useTestData: false, errorTest: "test error"
    });
    const errorSvg = "<svg>error</svg>";
    vi.mocked(renderError).mockReturnValue(errorSvg);

    await handler(req, res);

    expect(renderError).toHaveBeenCalledWith("test error", 600, 400, mockTheme);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
