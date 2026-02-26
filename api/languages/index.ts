import { parseQueryParams, type QueryParams } from "../../src/utils/params.js";
import { fetchLanguageData, processLanguageData } from "../../src/api/github.js";
import { generateChartData } from "../../src/render/chart.js";
import { renderSvg } from "../../src/render/svg.js";
import { renderError } from "../../src/render/error.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest, 
  res: VercelResponse
): Promise<void> {
  const params = parseQueryParams(req.query as QueryParams);
  const { chartType, chartTitle, width, height, count, selectedTheme, stroke, useTestData } = params;

  try {
    const rawData = await fetchLanguageData(useTestData);
    const normalizedData = processLanguageData(rawData, count);

    const { segments, legend } = generateChartData(normalizedData, selectedTheme, chartType, width, stroke);

    const svg = renderSvg(width, height, selectedTheme.bg, segments, legend, chartTitle, selectedTheme.text);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60");
    res.status(200).send(svg);
  } catch (error) {
    const errorSvg = renderError((error as Error).message, width, height, selectedTheme);
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(500).send(errorSvg);
  }
}
