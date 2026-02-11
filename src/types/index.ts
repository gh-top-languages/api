export type Point = {
  x: number;
  y: number;
};

export type Language = {
  lang: string;
  pct: number;
};

export type Geometry = {
  CENTER_Y: number;
  INNER_RADIUS: number;
  OUTER_RADIUS: number;
};

export type ChartResult = {
  segments: string;
  legend: string;
};

export type Theme = {
  colours: string[];
  text: string;
};
