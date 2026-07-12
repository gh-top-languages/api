import { parseQueryParams, type QueryParams     } from "@gh-top-languages/lib/utils/params.js";
import { sanitize                               } from "@gh-top-languages/lib/utils/sanitize.js";
import { generateChartData                      } from "@gh-top-languages/lib/charts/generate.js";
import { renderSvg                              } from "@gh-top-languages/lib/render/svg.js";
import { renderError                            } from "@gh-top-languages/lib/render/error.js";
import { fetchLanguageData, processLanguageData } from "./github.js";

export type ChartResponse = {
  status:  number;
  headers: Record<string, string>;
  body:    string;
};

export type RawQuery = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export async function handleLanguages(rawQuery: RawQuery): Promise<ChartResponse> {
  const query: QueryParams = Object.fromEntries(
    Object.entries(rawQuery).map(([k, v]) => [k, first(v)])
  );

  const {
    chartType, chartTitle,
    width, height, count,
    selectedTheme, gapType, stroke
  } = parseQueryParams(query);

  const errorTest = sanitize(query["error"] ?? "");
  try {
    if (errorTest) throw new Error(errorTest);

    const rawData        = await fetchLanguageData(query["test"] === "true");
    const normalizedData = processLanguageData(rawData, count);
    const chart          = generateChartData(normalizedData, selectedTheme, chartType, gapType, stroke);
    const svg            = renderSvg(width, height, selectedTheme.bg, chart, chartTitle, selectedTheme.text);
    return {
      status: 200,
      headers: {
        "Content-Type":  "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=60"
      },
      body: svg
    };
  } catch (error) {
    console.error("[api/languages]", error);
    return {
      status: 200, // Return 200 so error SVGs render in GitHub README <img> embeds (camo proxy drops non-200 bodies)
      headers: {
        "Content-Type":  "image/svg+xml",
        "Cache-Control": "no-store",
        "X-Chart-Error": "true"
      },
      body: renderError((error as Error).message, width, height, selectedTheme)
    };
  }
}
