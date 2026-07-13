import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimitReset } from "../../src/github/rateLimit.js";

const res = (status: number, headers: Record<string, string> = {}) => ({
  status, headers: { get: (h: string) => headers[h] ?? null }
}) as unknown as Response;

describe("rateLimitReset", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns reset time for 403 with exhausted primary limit", () => {
    expect(rateLimitReset(res(403, { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1800000000" })))
      .toBe(1800000000 * 1000);
  });

  it("detects 429 secondary limit the same way", () => {
    expect(rateLimitReset(res(429, { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "1800000000" })))
      .toBe(1800000000 * 1000);
  });

  it("computes reset from Retry-After relative to now", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    expect(rateLimitReset(res(403, { "Retry-After": "60" }))).toBe(1_000_000 + 60_000);
  });

  it("returns null for a plain 403 with remaining quota", () => {
    expect(rateLimitReset(res(403, { "X-RateLimit-Remaining": "42" }))).toBeNull();
  });

  it("returns null when limited but reset header is missing or garbage", () => {
    expect(rateLimitReset(res(403, { "X-RateLimit-Remaining": "0" }))).toBeNull();
    expect(rateLimitReset(res(403, { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "soon" }))).toBeNull();
  });
});
