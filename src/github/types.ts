export type Repo = {
  name:      string;
  fork:      boolean;
  full_name: string;
};

export type Source = { name: string; token?: string };
export type SourceKind = "user" | "org";

export type LanguageBytes = Record<string, number>;

export type FetchOutcome =
  | { kind: "ok";      data: LanguageBytes }
  | { kind: "missing" }
  | { kind: "failed";  data: LanguageBytes; retryAt: number | null };

export type CacheEntry = {
  data:        LanguageBytes | null;
  inFlight:    Promise<FetchOutcome> | null;
  lastRefresh: number;
  missingUntil?: number;
};
