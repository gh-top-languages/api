export type Mode =
  | { mode: "personal" }
  | { mode: "enumerated"; allowed: string[] }
  | { mode: "open" };

const MAX_OPEN_SOURCES = 10;
const VALID_LOGIN = /^[a-zA-Z0-9](?:-?[a-zA-Z0-9]){0,38}$/;

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

function parseNames(raw: string, context: string): string[] {
  const names = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (names.length === 0) throw new Error(`${context} contains no valid entries`);
  for (const name of names) if (!VALID_LOGIN.test(name)) throw new Error(
    `${context}: "${name}" is not a valid GitHub account name`
  );
  return names;
}

export function resolveSources(param: string | undefined, mode: Mode): string[] | null {
  const names = param?.split(',').map(s => s.trim()).filter(Boolean) ?? [];

  if (names.length === 0) {
    if (mode.mode === "open") throw new Error("This instance requires ?source=<name>[,<name>...]");
    return null;
  }

  if (mode.mode === "personal") throw new Error("Source selection is not enabled on this instance");

  if (mode.mode === "open") {
    if (names.length > MAX_OPEN_SOURCES) throw new Error(
      `Too many sources: at most ${MAX_OPEN_SOURCES} per request`
    );
    for (const name of names) if (!VALID_LOGIN.test(name)) throw new Error("Invalid source name");
    return names;
  }

  return names.map(n => {
    const hit = mode.allowed.find(a => a.toLowerCase() === n.toLowerCase());
    if (!hit) throw new Error("Unknown or disallowed source");
    return hit;
  });
}
