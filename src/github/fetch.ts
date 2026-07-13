import type { CacheEntry, LanguageBytes, Repo, Source, SourceKind } from "./types.js";
import { parseNextLink, parseSources       } from "./parse.js";
import { FALLBACK_RETRY_MS, rateLimitReset } from "./rateLimit.js";

const REFRESH_INTERVAL = 1000 * 60 * 60;
const NEGATIVE_TTL     = 1000 * 60 * 10;

export class SourceNotFoundError extends Error {
  constructor() { super("Unknown GitHub account"); }
}

const cache = new Map<string, CacheEntry>();

export async function fetchLanguageData(useTestData = false): Promise<LanguageBytes> {
  if (useTestData) {
    const testData = await import ("../test-data.json", { with: { type: "json" } });
    return testData.default;
  }

  const usernames = parseSources(process.env["GITHUB_USERNAMES"]);
  const orgs      = parseSources(process.env["GITHUB_ORGS"]);

  if (usernames.length === 0 && orgs.length === 0) throw new Error(
    "At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set"
  );

  const results = await Promise.all([
    ...usernames.map(u => fetchSource("user", u)),
    ...orgs.map     (o => fetchSource("org",  o))
  ]);

  return mergeLanguages(results);
}

export function resetCache(): void { cache.clear(); }

function fetchSource(kind: SourceKind, source: Source, strict = false): Promise<LanguageBytes> {
  const key = `${kind}:${source.name.toLowerCase()}`;
  let entry = cache.get(key);
  if (!entry) { entry = { data: null, lastRefresh: 0, inFlight: null }; cache.set(key, entry); }

  const now = Date.now();
  if (entry.missingUntil && now < entry.missingUntil) {
    if (strict) return Promise.reject(new SourceNotFoundError());
    return Promise.resolve({});
  }
  if (entry.data && now - entry.lastRefresh < REFRESH_INTERVAL) return Promise.resolve(entry.data);
  if (entry.inFlight) return entry.inFlight;

  entry.inFlight = fetchOne(kind, source, entry, now, strict).finally(() => { entry.inFlight = null; });
  return entry.inFlight;
}

async function fetchOne(kind: SourceKind, source: Source, entry: CacheEntry, now: number, strict: boolean): Promise<LanguageBytes> {
  const token = source.token ?? (process.env["GITHUB_TOKEN"]?.trim() || undefined);

  let rateLimitResetAt: number | null = null;
  const noteReset = (ms: number) => { rateLimitResetAt = Math.max(rateLimitResetAt ?? 0, ms); };
  let hadFetchFailure = false;

  let repos: Repo[] = [];
  try {
    repos = await fetchAllRepos(
      kind === "org"    ? `https://api.github.com/orgs/${encodeURIComponent(source.name)}/repos?per_page=100`
      : source.token    ? `https://api.github.com/user/repos?per_page=100&visibility=all&affiliation=owner`
                        : `https://api.github.com/users/${encodeURIComponent(source.name)}/repos?per_page=100`,
      noteReset,
      token
    );
  } catch (e) {
    if (e instanceof SourceNotFoundError) {
      entry.missingUntil = now + NEGATIVE_TTL;
      entry.data = null;
      if (strict) throw e;
      return {};
    }
    hadFetchFailure = true;
    console.error(`Skipping ${kind} "${source.name}": failed to fetch repositories.`);
  }

  const ignored = process.env["IGNORED_REPOS"]?.split(',').map(s => s.trim()) || [];

  const langResults = await Promise.all(
    repos.filter(r => !r.fork && !ignored.includes(r.name) && !ignored.includes(r.full_name)).map(repo =>
      fetch(`https://api.github.com/repos/${repo.full_name.split('/').map(encodeURIComponent).join('/')}/languages`, makeOptions(token))
        .then(r => {
          if (r.ok) return r.json() as Promise<LanguageBytes>;
          hadFetchFailure = true;
          const reset = rateLimitReset(r);
          if (reset) noteReset(reset);
          return {} as LanguageBytes;
        })
        .catch(() => { hadFetchFailure = true; return {} as LanguageBytes; })
    )
  );

  const result = mergeLanguages(langResults);

  if (hadFetchFailure) {
    if (rateLimitResetAt !== null) console.error(
      `GitHub rate limit exceeded; resets at ${new Date(rateLimitResetAt).toLocaleTimeString()}`
    );
    if (entry.data !== null) {
      const retryDelay = rateLimitResetAt
        ? Math.min(Math.max(rateLimitResetAt - now, 60_000), REFRESH_INTERVAL)
        : FALLBACK_RETRY_MS;
      entry.lastRefresh = now - REFRESH_INTERVAL + retryDelay;
      return entry.data;
    }
    return result;
  }

  entry.data = result;
  entry.lastRefresh = now;
  return result;
}

async function fetchAllRepos(
  url: string,
  onRateLimit: (resetMs: number) => void,
  token?: string
): Promise<Repo[]> {
  const options = makeOptions(token);
  let nextUrl: string | null = url;
  const repos: Repo[]        = [];

  while (nextUrl) {
    const response = await fetch(nextUrl, options);
    if (!response.ok) {
      if (response.status === 404 && repos.length === 0) throw new SourceNotFoundError();
      const reset = rateLimitReset(response);
      if (reset) onRateLimit(reset);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    repos.push(...(await response.json() as Repo[]));
    nextUrl = parseNextLink(response.headers.get("Link"));
    if (nextUrl && !nextUrl.startsWith("https://api.github.com/")) throw new Error(
      `Unexpected pagination URL: ${nextUrl}`
    );
  }

  return repos;
}

function mergeLanguages(all: LanguageBytes[]): LanguageBytes {
  return all.reduce<LanguageBytes>((acc, languages) => {
    for (const [lang, bytes] of Object.entries(languages)) acc[lang] = (acc[lang] || 0) + bytes;
    return acc;
  }, {});
}

function makeOptions(token?: string): RequestInit {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}
