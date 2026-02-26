import { DEFAULT_CONFIG, MAX_COUNT } from "../constants/config.js";
import { THEMES } from "../constants/themes.js";
import { VALID_TYPES } from "../constants/types.js";
import { sanitize } from "./sanitize.js";
import type { ChartType } from "../types.js";

export type QueryParams = Record<string, string | undefined>;

const parseIntSafe = (
  val: string | undefined, 
  fallback: number
): number => {
  const parsed = Number.parseInt(val ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseQueryParams(query: QueryParams) {
  const baseTheme = THEMES[query["theme"] as keyof typeof THEMES] ?? THEMES.default;
  const count = parseIntSafe(query["count"], DEFAULT_CONFIG.COUNT);

  const customColours = [...baseTheme.colours] as string[];
  for (let i = 1; i <= MAX_COUNT; i++) {
    const colourVal = query[`c${i}`];
    if(colourVal) customColours[i - 1] = `#${colourVal.replace(/^#/, '')}` as string;
  }

  const typeParam = query["type"] as ChartType | undefined;
  const chartType: ChartType = VALID_TYPES.some(t => t === typeParam) 
  ? typeParam! 
  : "donut";

  return {
    chartType,
    chartTitle: query["hide_title"] === "true" ? '' : sanitize(query["title"] ?? DEFAULT_CONFIG.TITLE),
    width: Math.max(parseIntSafe(query["width"],  DEFAULT_CONFIG.WIDTH), DEFAULT_CONFIG.MIN_WIDTH),
    height: parseIntSafe(query["height"], DEFAULT_CONFIG.HEIGHT),
    count: Math.min(Math.max(count, 1), MAX_COUNT),
    selectedTheme: {
      bg: THEMES[query["bg"] as keyof typeof THEMES]?.bg ?? query["bg"] ?? baseTheme.bg,
      text: query["text"] ?? baseTheme.text,
      colours: customColours
    },
    stroke: query["stroke"] === "true",
    useTestData: query["test"] === "true"
  }
}
