import { REFRESH_INTERVAL } from "@gh-top-languages/lib/constants/config.js";
import type { Language    } from "@gh-top-languages/lib/types.js";

type Source = { name: string; token?: string };

type LanguageBytes = Record<string, number>;

let cachedLanguageData: LanguageBytes | null = null;
let lastRefresh = 0;

function parseSources(env: string | undefined): Source[] {
  if (!env) return [];
  try {
    const parsed = JSON.parse(env);
    if (Array.isArray(parsed)) {
      return parsed.map(entry =>
        typeof entry === "string" ? { name: entry } : entry
      );
    }

  } catch {

  }
  return env.split(',').map(s => ({ name: s.trim().replace(/^["']|["']$/g, "") })).filter(s => s.name);
}

function makeOptions(token?: string): RequestInit {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
}

type Repo = {
  name:      string;
  fork:      boolean;
  full_name: string;
};

async function fetchAllRepos(url: string, token?: string): Promise<Repo[]> {
  const options = makeOptions(token);
  let nextUrl: string | null = url;
  const repos: Repo[]        = [];

  while (nextUrl) {
    const response = await fetch(nextUrl, options);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    repos.push(...(await response.json() as Repo[]));
    nextUrl = parseNextLink(response.headers.get("Link"));
  }

  return repos;
}

export async function fetchLanguageData(useTestData = false): Promise<LanguageBytes> {
  if (useTestData) {
    const testData = await import ("../data/test-data.json", { with: { type: "json" } });
    return testData.default;
  }

  const now = Date.now();
  if (cachedLanguageData && now - lastRefresh < REFRESH_INTERVAL) return cachedLanguageData;

  const usernames = parseSources(process.env["GITHUB_USERNAMES"]);
  const orgs      = parseSources(process.env["GITHUB_ORGS"]);

  if (usernames.length === 0 && orgs.length === 0) throw new Error(
    "At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set"
  );

  const repoGroups = await Promise.all([
    ...usernames.map(u =>
      fetchAllRepos(`https://api.github.com/users/${u.name}/repos?per_page=100`, u.token)
        .then(repos => ({ token: u.token, repos }))
    ),
    ...orgs.map(o =>
      fetchAllRepos(`https://api.github.com/orgs/${o.name}/repos?per_page=100`, o.token)
        .then(repos => ({ token: o.token, repos }))
    )
  ]);

  const ignored = process.env["IGNORED_REPOS"]?.split(',').map(name => name.trim()) || [];

  const languageFetches = repoGroups.flatMap(({ token, repos }) =>
    repos.filter(repo => !repo.fork && !ignored.includes(repo.name)).map(repo =>
      fetch(`https://api.github.com/repos/${repo.full_name}/languages`, makeOptions(token))
        .then(r => r.ok ? (r.json() as Promise<LanguageBytes>) : ({} as LanguageBytes))
        .catch(() => ({} as LanguageBytes))
    )
  );

  const langResults: LanguageBytes[] = await Promise.all(languageFetches);

  cachedLanguageData = langResults.reduce<LanguageBytes>((acc, languages) => {
    for (const [lang, bytes] of Object.entries(languages)) {
      acc[lang] = (acc[lang] || 0) + bytes;
    }
    return acc;
  }, {});

  lastRefresh = now;
  return cachedLanguageData;
}

export function processLanguageData(languageBytes: LanguageBytes, count: number): Language[] {
  if (Object.keys(languageBytes).length === 0) throw new Error("No language data available");

  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  
  const sortedLanguages = Object.entries(languageBytes)
    .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const topLanguages = sortedLanguages.slice(0, count);
  const totalPct     = topLanguages.reduce((sum, lang) => sum + lang.pct, 0);
  return topLanguages.map(lang => ({
    ...lang,
    pct: (lang.pct / totalPct) * 100
  }));
}

export function resetCache(): void {
  cachedLanguageData = null;
  lastRefresh = 0;
}
