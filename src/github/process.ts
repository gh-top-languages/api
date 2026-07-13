import type { Language      } from "@gh-top-languages/lib/charts/types.js";
import type { LanguageBytes } from "./types";

export function processLanguageData(languageBytes: LanguageBytes, count: number): Language[] {
  if (Object.keys(languageBytes).length === 0) throw new Error("No language data available");

  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);

  const sortedLanguages = Object.entries(languageBytes)
    .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  return sortedLanguages.slice(0, count);
}
