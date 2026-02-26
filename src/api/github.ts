import { REFRESH_INTERVAL } from "../constants/config.js";
import type { Language } from "../types.js";

type LanguageBytes = Record<string, number>;

let cachedLanguageData: LanguageBytes | null = null;
let lastRefresh = 0;

export async function fetchLanguageData(
  useTestData = false
): Promise<LanguageBytes> {
  if (useTestData) {
    const testData = await import ("../data/test-data.json", { with: { type: "json" } });
    return testData.default;
  }

  const now = Date.now();
  if (cachedLanguageData && now - lastRefresh < REFRESH_INTERVAL) 
    return cachedLanguageData;

  const usernames = process.env["GITHUB_USERNAMES"]?.split(',').map(u => u.trim()).filter(Boolean) || [];
  const orgs = process.env["GITHUB_ORGS"]?.split(',').map(o => o.trim()).filter(Boolean) || [];

  if(usernames.length === 0 && orgs.length === 0) 
    throw new Error("At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set");

  const fetchPromises = [
    ...usernames.map(user => fetch(`https://api.github.com/users/${user}/repos?per_page=100`)),
    ...orgs.map(org => fetch(`https://api.github.com/orgs/${org}/repos?per_page=100`))
  ];

  const responses = await Promise.all(fetchPromises);

  for (const response of responses) 
    if (!response.ok) throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);

  const repoArrays = await Promise.all(responses.map(r => r.json()));
  const repos = repoArrays.flat();

  const ignored = process.env["IGNORED_REPOS"]?.split(',').map(name => name.trim()) || [];
  const filteredRepos = repos.filter(repo => !repo.fork && !ignored.includes(repo.name));

  const languageFetches = filteredRepos.map(repo =>
    fetch(`https://api.github.com/repos/${repo.full_name}/languages`)
      .then(r => r.ok ? r.json() : {})
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
  if(Object.keys(languageBytes).length === 0)
    throw new Error("No language data available");

  const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
  
  const sortedLanguages = Object.entries(languageBytes)
    .map(([lang, bytes]) => ({ lang, pct: (bytes / totalBytes) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const topLanguages = sortedLanguages.slice(0, count);

  const totalPct = topLanguages.reduce((sum, lang) => sum + lang.pct, 0);
  return topLanguages.map(lang => ({
    ...lang,
    pct: (lang.pct / totalPct) * 100
  }));
}

export function resetCache(): void {
  cachedLanguageData = null;
  lastRefresh = 0;
}
