export type Repo = {
  name:      string;
  fork:      boolean;
  full_name: string;
};

export type Source = { name: string; token?: string };
export type SourceKind = "user" | "org";

export type LanguageBytes = Record<string, number>;
export type CacheEntry = {
  data:        LanguageBytes | null;
  lastRefresh: number;
  inFlight:    Promise<LanguageBytes> | null;
};
