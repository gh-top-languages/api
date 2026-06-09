import type { VercelRequest, VercelResponse     } from "@vercel/node";
import { parseQueryParams, type QueryParams     } from "../../src/utils/params.js";
import { fetchLanguageData, processLanguageData } from "../../src/services/github.js";
import { generateChartData                      } from "../../src/render/chart.js";
import { renderSvg                              } from "../../src/render/svg.js";
import { renderError                            } from "../../src/render/error.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const {
    chartType, chartTitle,
    width, height, count,
    selectedTheme, stroke,
    useTestData
  } = parseQueryParams(req.query as QueryParams);

  try {
    const rawData              = await fetchLanguageData(useTestData);
    const normalizedData       = processLanguageData(rawData, count);
    const { segments, legend } = generateChartData(normalizedData, selectedTheme, chartType, width, stroke);
    const svg                  = renderSvg(width, height, selectedTheme.bg, segments, legend, chartTitle, selectedTheme.text);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60");
    res.status(200).send(svg);
  } catch (error) {
    const errorSvg = renderError((error as Error).message, width, height, selectedTheme);
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(500).send(errorSvg);
  }
}
