import type { RawQuery } from "./handler.js";

export type VercelRequest = {
  query: RawQuery;
  headers: RawQuery;
};

export type VercelResponse = {
  setHeader(key: string, value: string | number | readonly string[]): void;
  status(code: number): VercelResponse;
  send(body: unknown): void;
};
