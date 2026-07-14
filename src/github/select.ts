import { MAX_OPEN_SOURCES, VALID_LOGIN } from "./constants.js";
import { parseNames                    } from "./parse.js";

export type Mode =
  | { mode: "personal" }
  | { mode: "enumerated"; allowed: string[] }
  | { mode: "open" };

export class SelectionError extends Error {}

export function detectMode(env: NodeJS.ProcessEnv): Mode {
  const personal = !!(env["GITHUB_USERNAMES"]?.trim() || env["GITHUB_ORGS"]?.trim());
  const allowed  = env["GITHUB_ALLOWED_SOURCES"]?.trim();

  if (personal && allowed) throw new Error(
    "GITHUB_ALLOWED_SOURCES cannot be combined with GITHUB_USERNAMES/GITHUB_ORGS"
  );
  if (!personal && !allowed) throw new Error(
    "Set GITHUB_USERNAMES/GITHUB_ORGS, or GITHUB_ALLOWED_SOURCES for a hosted instance"
  );
  if (personal)        return { mode: "personal" };
  if (allowed === "*") return { mode: "open" };
  return { mode: "enumerated", allowed: parseNames(allowed!, "GITHUB_ALLOWED_SOURCES") };
}

export function resolveSources(param: string | undefined, mode: Mode): string[] | null {
  const names = param?.split(',').map(s => s.trim()).filter(Boolean) ?? [];

  if (names.length === 0) {
    if (mode.mode === "open") throw new SelectionError("This instance requires ?source=<name>[,<name>...]");
    return null;
  }

  if (mode.mode === "personal") throw new SelectionError("Source selection is not enabled on this instance");

  if (mode.mode === "open") {
    const unique = [...new Set(names.map(n => n.toLowerCase()))];
    if (unique.length > MAX_OPEN_SOURCES) throw new SelectionError(
      `Too many sources: at most ${MAX_OPEN_SOURCES} per request`
    );
    for (const name of unique) if (!VALID_LOGIN.test(name)) throw new SelectionError("Invalid source name");
    return unique;
  }

  return [...new Set(names.map(n => {
    const hit = mode.allowed.find(a => a.toLowerCase() === n.toLowerCase());
    if (!hit) throw new SelectionError("Unknown or disallowed source");
    return hit;
  }))];
}

export function checkReferer(rawReferer: string | undefined, env: NodeJS.ProcessEnv): void {
  const allowed = env["ALLOWED_REFERERS"]?.trim();
  if (!allowed) return;

  const hosts = allowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  let host: string | null = null;
  try { host = rawReferer ? new URL(rawReferer).hostname.toLowerCase() : null; } catch { /* malformed header */ }

  if (!host || !hosts.includes(host)) throw new SelectionError(
    "This instance only serves its own site - deploy your own from github.com/gh-top-languages/api"
  );
}
