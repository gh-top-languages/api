import type { Source } from "./types.js";

export function parseSources(env: string | undefined): Source[] {
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

export function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
}
