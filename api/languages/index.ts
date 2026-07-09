import type { VercelRequest, VercelResponse     } from "@vercel/node";
import { parseQueryParams, type QueryParams     } from "@gh-top-languages/lib/utils/params.js";
import { sanitize                                } from "@gh-top-languages/lib/utils/sanitize.js";
import { generateChartData                      } from "@gh-top-languages/lib/charts/generate.js";
import { renderSvg                              } from "@gh-top-languages/lib/render/svg.js";
import { renderError                            } from "@gh-top-languages/lib/render/error.js";
import { fetchLanguageData, processLanguageData } from "../../src/services/github.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const {
    chartType, chartTitle,
    width, height, count,
    selectedTheme, gapType, stroke
  } = parseQueryParams(req.query as QueryParams);

  const errorTest = sanitize(req.query["error"] ?? "");
  try {
    if (errorTest) throw new Error(errorTest);

    const rawData        = await fetchLanguageData(req.query["test"] === "true");
    const normalizedData = processLanguageData(rawData, count);
    const chart          = generateChartData(normalizedData, selectedTheme, chartType, gapType, stroke);
    const svg            = renderSvg(width, height, selectedTheme.bg, chart, chartTitle, selectedTheme.text);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60");
    res.status(200).send(svg);
  } catch (error) {
    console.error("[api/languages]", error);
    const errorSvg = renderError((error as Error).message, width, height, selectedTheme);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Chart-Error", "true");
    res.status(200).send(errorSvg); // Return 200 so error SVGs render in GitHub README <img> embeds (camo proxy drops non-200 bodies)
  }
}
