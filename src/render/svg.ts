import { TITLE_STYLES } from "../constants/styles"

export function renderSvg(
  width: number,
  height: number,
  background: string,
  segments: string,
  legend: string,
  title: string,
  textColour: string
): string {
  const titleElement = title ? `
    <text 
      x="${width/2}" 
      y="${TITLE_STYLES.TEXT_Y}" 
      text-anchor="middle" fill="${textColour}" 
      font-family="Arial" font-size="${TITLE_STYLES.FONT_SIZE}"
    >
      ${title}
    </text>
  ` : '';

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${background}" rx="10"/>
      ${titleElement}
      ${segments}
      ${legend}
    </svg>
  `;
}
