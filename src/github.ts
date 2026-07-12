import type { Language } from "@gh-top-languages/lib/charts/types.js";

const REFRESH_INTERVAL = 1000 * 60 * 60;

type Repo = {
  name:      string;
  fork:      boolean;
  full_name: string;
};

type Source = { name: string; token?: string };

type LanguageBytes = Record<string, number>;

let cachedLanguageData: LanguageBytes | null = null;
let lastRefresh = 0;

function parseSources(env: string | undefined): Source[] {
  if (!env) return [];

  const trimmed = env.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(env);
      return (parsed as unknown[]).map(entry => {
        if (typeof entry === "string" && entry.trim()) return { name: entry.trim() };
        if (entry && typeof entry === "object" && "name" in entry && typeof entry.name === "string" && entry.name.trim()) {
          const source: Source = { name: entry.name.trim() };
          if ("token" in entry
           && typeof entry.token === "string"
           && entry.token.trim()
          ) source.token = entry.token.trim();
          return source;
        }
        return null;
      }).filter((s): s is Source => !!s);
    } catch {
      console.error("Failed to parse configuration JSON array.");
      throw new Error("GITHUB_USERNAMES/GITHUB_ORGS must be a valid JSON array. Check your configuration.");
    }
  }

  return trimmed.split(',').map(s => ({ name: s.trim().replace(/^["']|["']$/g, "") })).filter(s => s.name);
}

function makeOptions(token?: string): RequestInit {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
}

async function fetchAllRepos(url: string, token?: string): Promise<Repo[]> {
  const options = makeOptions(token);
  let nextUrl: string | null = url;
  const repos: Repo[]        = [];

  while (nextUrl) {
    const response = await fetch(nextUrl, options);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    repos.push(...(await response.json() as Repo[]));
    nextUrl = parseNextLink(response.headers.get("Link"));
    if (nextUrl && !nextUrl.startsWith("https://api.github.com/")) throw new Error(
      `Unexpected pagination URL: ${nextUrl}`
    );
  }

  return repos;
}

export async function fetchLanguageData(useTestData = false): Promise<LanguageBytes> {
  if (useTestData) {
    const testData = await import ("./test-data.json", { with: { type: "json" } });
    return testData.default;
  }

  const now = Date.now();
  if (cachedLanguageData && now - lastRefresh < REFRESH_INTERVAL) return cachedLanguageData;

  const usernames = parseSources(process.env["GITHUB_USERNAMES"]);
  const orgs      = parseSources(process.env["GITHUB_ORGS"]);

  if (usernames.length === 0 && orgs.length === 0) throw new Error(
    "At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set"
  );

  let hadFetchFailure = false;
  const repoGroups = await Promise.all([
    ...usernames.map(u =>
      fetchAllRepos(`https://api.github.com/users/${encodeURIComponent(u.name)}/repos?per_page=100`, u.token)
        .then(repos => ({ token: u.token, repos }))
        .catch(() => {
          hadFetchFailure = true;
          console.error(`Skipping user "${u.name}": failed to fetch repositories.`);
          return { token: u.token, repos: [] as Repo[] };
        })
    ),
    ...orgs.map(o =>
      fetchAllRepos(`https://api.github.com/orgs/${encodeURIComponent(o.name)}/repos?per_page=100`, o.token)
        .then(repos => ({ token: o.token, repos }))
        .catch(() => {
          hadFetchFailure = true;
          console.error(`Skipping org "${o.name}": failed to fetch repositories.`);
          return { token: o.token, repos: [] as Repo[] };
        })
    )
  ]);

  const ignored = process.env["IGNORED_REPOS"]?.split(',').map(s => s.trim()) || [];

  const languageFetches = repoGroups.flatMap(({ token, repos }) =>
    repos.filter(repo => !repo.fork && !ignored.includes(repo.name) && !ignored.includes(repo.full_name)).map(repo =>
      fetch(`https://api.github.com/repos/${repo.full_name.split('/').map(encodeURIComponent).join('/')}/languages`, makeOptions(token))
        .then(r => r.ok ? (r.json() as Promise<LanguageBytes>) : ({} as LanguageBytes))
        .catch(() => { hadFetchFailure = true; return {} as LanguageBytes; })
    )
  );

  const langResults: LanguageBytes[] = await Promise.all(languageFetches);

  const result = langResults.reduce<LanguageBytes>((acc, languages) => {
    for (const [lang, bytes] of Object.entries(languages)) {
      acc[lang] = (acc[lang] || 0) + bytes;
    }
    return acc;
  }, {});

  if (hadFetchFailure) {
    if (cachedLanguageData !== null) {
      lastRefresh = now - REFRESH_INTERVAL + (5 * 60 * 1000);
      return cachedLanguageData;
    }
    return result;
  }

  cachedLanguageData = result;
  lastRefresh = now;
  return result;
}

export function processLanguageData(languageBytes: LanguageBytes, count: number): Language[] {
  if (Object.keys(languageBytes).length === 0) throw new Error("No language data available");

  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  
  const sortedLanguages = Object.entries(languageBytes)
    .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  return sortedLanguages.slice(0, count);
}

export function resetCache(): void {
  cachedLanguageData = null;
  lastRefresh = 0;
}
