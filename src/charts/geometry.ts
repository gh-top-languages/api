import { FULL_CIRCLE_ANGLE } from "../constants/geometry";
import { Point, Language, Geometry } from "../types"

export const polarToCartesian = (
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): Point => {
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + (r * Math.cos(angleRad)),
    y: cy + (r * Math.sin(angleRad))
  };
};

export const describeSegment = (
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string => {
  const angleDiff = endAngle - startAngle

  if (angleDiff >= 360 || angleDiff <= -360) {
    const midAngle = startAngle + 180;
    const firstHalf = describeSegment(cx, cy, innerR, outerR, startAngle, midAngle);
    const secondHalf = describeSegment(cx, cy, innerR, outerR, midAngle, endAngle);
    return firstHalf + ' ' + secondHalf;
  }

  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter   = polarToCartesian(cx, cy, outerR, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  if (innerR === 0) {
    return `
      M ${cx} ${cy}
      L ${startOuter.x} ${startOuter.y}
      A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}
      Z
    `.trim();
  }

  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner   = polarToCartesian(cx, cy, innerR, endAngle);

  return `
    M ${startOuter.x} ${startOuter.y} 
    A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y} 
    L ${startInner.x} ${startInner.y} 
    A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y} 
    Z
  `.trim();
};

export const createDonutSegments = (
  languages: Language[],
  cx: number,
  geometry: Geometry,
  colours: string[],
  stroke: boolean
): string => {
  let currentAngle = -0.1;

  return languages.map((lang, i) => {
    let angle = (lang.pct / 100) * 360;

    const segmentAngle =  Math.min(currentAngle + angle + 0.1, FULL_CIRCLE_ANGLE);
    const path = describeSegment(
      cx,
      geometry.CENTER_Y,
      geometry.INNER_RADIUS,
      geometry.OUTER_RADIUS,
      currentAngle,
      segmentAngle
    );

    currentAngle += angle;
    const fillColour = colours[i % colours.length];
    const strokeAttr = stroke
      ? ` stroke="#000" stroke-width="0.5" stroke-linejoin="round"`
      : ` stroke="${fillColour}" stroke-width="0.2"`;
    return `<path d="${path}" fill="${fillColour}"${strokeAttr} shape-rendering="geometricPrecision"/>`;
  }).join('');
}
