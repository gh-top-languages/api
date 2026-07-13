export const FALLBACK_RETRY_MS = 5 * 60 * 1000;

export function rateLimitReset(r: Response): number | null {
  const retryAfter = r.headers.get("Retry-After");
  const primary = (r.status === 403 || r.status === 429)
    && r.headers.get("X-RateLimit-Remaining") === "0";
  if (!retryAfter && !primary) return null;
  const resetMs = retryAfter
    ? Date.now() + Number(retryAfter) * 1000
    : Number(r.headers.get("X-RateLimit-Reset")) * 1000;
  return Number.isFinite(resetMs) ? resetMs : null;
}
