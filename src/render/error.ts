import { THEMES } from "../constants/themes.js";
import { ERROR_STYLES } from "../constants/styles.js"
import type { Theme } from "../types.js";

export function renderError(
  message: string,
  width: number,
  height: number,
  selectedTheme?: Theme
): string {
  const background = selectedTheme?.bg || THEMES.default.bg; 
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${background}" rx="10"/>
      <text x="${width/2}" y="${ERROR_STYLES.TEXT_Y}" text-anchor="middle" fill="${ERROR_STYLES.COLOUR}" font-family="Arial" font-size="${ERROR_STYLES.FONT_SIZE}">
        Error: ${message}
      </text>
    </svg>
  `;
}
