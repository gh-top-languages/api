import { describe, it, expect, vi, beforeEach, afterEach    } from "vitest";
import { fetchLanguageData, processLanguageData, resetCache } from "../src/github.js";

const repos = [
  { name: "repo1",        fork: false, full_name: "user/repo1"        },
  { name: "repo2",        fork: true,  full_name: "user/repo2"        },
  { name: "ignored-repo", fork: false, full_name: "user/ignored-repo" }
];

const languages = {
  JavaScript: 5000,
  Python:     3000,
  HTML:       2000
};

const mockFetch = () => vi.mocked(global.fetch);

const mockResponse = (data: unknown, link: string | null = null) => ({
  ok:      true,
  json:    async () => data,
  headers: { get: (h: string) => h === "Link" ? link : null }
}) as unknown as Response;

const mockErrorResponse = (status: number, statusText = "") => (
  { ok: false, status, statusText }
) as unknown as Response;

describe("fetchLanguageData", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_USERNAMES", `["testuser"]`);
    vi.stubEnv("IGNORED_REPOS", "ignored-repo");
    global.fetch = vi.fn();
    vi.resetModules();
    resetCache();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses test data when useTestData is true", async () => {
    const result = await fetchLanguageData(true);
    expect(result).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws error when GITHUB_USERNAMES env variable not set", async () => {
    vi.unstubAllEnvs();
    await expect(fetchLanguageData()).rejects.toThrow("At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set");
  });

  it("propagates a rejection to all concurrent callers", async () => {
    vi.unstubAllEnvs();
    await expect(Promise.all([fetchLanguageData(), fetchLanguageData()]))
      .rejects.toThrow("At least one of GITHUB_USERNAMES or GITHUB_ORGS must be set");
  });

  it("handles missing IGNORED_REPOS env variable", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_USERNAMES", `["testuser"]`);

    mockFetch()
      .mockResolvedValueOnce(mockResponse(repos))
      .mockResolvedValueOnce(mockResponse(languages))
      .mockResolvedValueOnce(mockResponse({}));

    const result = await fetchLanguageData();
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ JavaScript: 5000, Python: 3000, HTML: 2000 });
  });

  it("fetches repos and filters forks and ignored", async () => {
    mockFetch()
      .mockResolvedValueOnce(mockResponse(repos))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/users/testuser/repos?per_page=100", {}
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/user/repo1/languages", {}
    );

    expect(global.fetch).not.toHaveBeenCalledWith(
      "https://api.github.com/repos/user/repo2/languages", {}
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      "https://api.github.com/repos/user/ignored-repo/languages", {}
    );
  });

  it("ignores repos by owner/name to scope across sources", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_USERNAMES", `["testuser"]`);
    vi.stubEnv("IGNORED_REPOS", "otheruser/blog");

    const scopedRepos = [
      { name: "blog", fork: false, full_name: "testuser/blog" },
      { name: "notes", fork: false, full_name: "testuser/notes" }
    ];

    mockFetch()
      .mockResolvedValueOnce(mockResponse(scopedRepos))
      .mockResolvedValueOnce(mockResponse(languages))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/testuser/blog/languages", {}
    );
  });

  it("aggregates language bytes across repos", async () => {
    const repos = [
      { name: "repo1", fork: false, full_name: "user/repo1" },
      { name: "repo2", fork: false, full_name: "user/repo2" }
    ];

    mockFetch()
      .mockResolvedValueOnce(mockResponse(repos))
      .mockResolvedValueOnce(mockResponse({ JavaScript: 1000 }))
      .mockResolvedValueOnce(mockResponse({ JavaScript: 500, Python: 300 }));

    const result = await fetchLanguageData();
    expect(result).toEqual({ JavaScript: 1500, Python: 300 });
  });

  it("handles repos API error gracefully", async () => {
    mockFetch().mockResolvedValueOnce(mockErrorResponse(404, "Not Found"));
    const result = await fetchLanguageData();
    expect(result).toEqual({});
  });

  it("handles org repos API error gracefully", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_ORGS", '["test-org"]');

    mockFetch().mockResolvedValueOnce(mockErrorResponse(403, "Forbidden"));

    const result = await fetchLanguageData();
    expect(result).toEqual({});
  });

  it("caches results within refresh interval", async () => {
    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    const result1 = await fetchLanguageData();
    const result2 = await fetchLanguageData();
    expect(result1).toBe(result2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent calls into a single fetch", async () => {
    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    const [result1, result2] = await Promise.all([
      fetchLanguageData(),
      fetchLanguageData()
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result1).toBe(result2);
  });

  it("handles failed language fetch gracefully", async () => {
    const repos = [
      { name: "repo1", fork: false, full_name: "user/repo1" },
      { name: "repo2", fork: false, full_name: "user/repo2" }
    ];

    mockFetch()
      .mockResolvedValueOnce(mockResponse(repos))
      .mockResolvedValueOnce(mockErrorResponse(403))
      .mockResolvedValueOnce(mockResponse({ Python: 500 }));

    const result = await fetchLanguageData();
    expect(result).toEqual({ Python: 500 });
  });

  it("does not cache a cold-start total failure and retries on next call", async () => {
    mockFetch().mockResolvedValueOnce(mockErrorResponse(500, "Internal Server Error"));
    await fetchLanguageData();

    mockFetch().mockResolvedValueOnce(mockResponse([repos[0]])).mockResolvedValueOnce(mockResponse(languages));
    const result = await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual(languages);
  });

  it("does not cache a partial failure as complete and retries on next call", async () => {
    const twoRepos = [
      { name: "repo1", fork: false, full_name: "user/repo1" },
      { name: "repo2", fork: false, full_name: "user/repo2" }
    ];

    mockFetch()
      .mockResolvedValueOnce(mockResponse(twoRepos))
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockResponse({ Python: 500 }));
    await fetchLanguageData();

    mockFetch()
      .mockResolvedValueOnce(mockResponse(twoRepos))
      .mockResolvedValueOnce(mockResponse({ JavaScript: 1000 }))
      .mockResolvedValueOnce(mockResponse({ Python: 500 }));
    const result = await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledTimes(6);
    expect(result).toEqual({ JavaScript: 1000, Python: 500 });
  });

  it("treats a non-ok language-fetch response as a failure, skipping the cache", async () => {
    const twoRepos = [
      { name: "repo1", fork: false, full_name: "user/repo1" },
      { name: "repo2", fork: false, full_name: "user/repo2" }
    ];

    mockFetch()
      .mockResolvedValueOnce(mockResponse(twoRepos))
      .mockResolvedValueOnce(mockErrorResponse(500))
      .mockResolvedValueOnce(mockResponse({ Python: 500 }));
    await fetchLanguageData();

    mockFetch()
      .mockResolvedValueOnce(mockResponse(twoRepos))
      .mockResolvedValueOnce(mockResponse({ JavaScript: 1000 }))
      .mockResolvedValueOnce(mockResponse({ Python: 500 }));
    const result = await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledTimes(6);
    expect(result).toEqual({ JavaScript: 1000, Python: 500 });
  });

  it("fetches from organizations", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_ORGS", `["test-org"]`);

    const orgRepos = [
      { name: "org-repo", fork: false, full_name: "test-org/org-repo" }
    ];

    mockFetch()
      .mockResolvedValueOnce(mockResponse(orgRepos))
      .mockResolvedValueOnce(mockResponse({ TypeScript: 4000 }));

    const result = await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/orgs/test-org/repos?per_page=100", {}
    );
    expect(result).toEqual({ TypeScript: 4000 });
  });

  it("follows Link header pagination across multiple pages", async () => {
    const page2Url = "https://api.github.com/users/testuser/repos?per_page=100&page=2";

    mockFetch()
      .mockResolvedValueOnce(mockResponse(
        [{ name: "repo1", fork: false, full_name: "user/repo1" }],
        `<${page2Url}>; rel="next"`
      ))
      .mockResolvedValueOnce(mockResponse(
        [{ name: "repo2", fork: false, full_name: "user/repo2" }]
      ))
      .mockResolvedValueOnce(mockResponse({ JavaScript: 1000 }))
      .mockResolvedValueOnce(mockResponse({ Python:     500  }));

    const result = await fetchLanguageData();
    expect(global.fetch).toHaveBeenCalledWith(page2Url, {});
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ JavaScript: 1000, Python: 500 });
  });

  it("stops when Link header has no rel=next", async () => {
    mockFetch()
      .mockResolvedValueOnce(mockResponse(
        [{ name: "repo1", fork: false, full_name: "user/repo1" }],
        `<https://api.github.com/users/testuser/repos?per_page=100>; rel="last"`
      ))
      .mockResolvedValueOnce(mockResponse({ Go: 300 }));

    const result = await fetchLanguageData();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ Go: 300 });
  });

  it("sends Authorization header when token is set per source", async () => {
    vi.stubEnv("GITHUB_USERNAMES", '[{"name": "testuser", "token": "test-token"}]');

    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/user/repos?per_page=100&visibility=all&affiliation=owner",
      { headers: { Authorization: "Bearer test-token" } }
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/user/repo1/languages",
      { headers: { Authorization: "Bearer test-token" } }
    );
  });

  it("parses CSV fallback for GITHUB_USERNAMES", async () => {
    vi.stubEnv("GITHUB_USERNAMES", "testuser");

    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/users/testuser/repos?per_page=100", {}
    );
  });

  it("returns empty sources for broken JSON array", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_USERNAMES", '["testuser"');

    await expect(fetchLanguageData()).rejects.toThrow(
      "GITHUB_USERNAMES/GITHUB_ORGS must be a valid JSON array. Check your configuration."
    );
  });

  it("skips malformed entries in JSON array", async () => {
    vi.stubEnv("GITHUB_USERNAMES", '[123, "testuser"]');

    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/users/testuser/repos?per_page=100", {}
    );
  });

  it("handles language fetch network failure gracefully", async () => {
    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchLanguageData();
    expect(result).toEqual({});
  });

  it("sends Authorization header for org token", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITHUB_ORGS", '[{"name": "test-org", "token": "org-token"}]');

    mockFetch()
      .mockResolvedValueOnce(mockResponse([{ name: "org-repo", fork: false, full_name: "test-org/org-repo" }]))
      .mockResolvedValueOnce(mockResponse({ TypeScript: 4000 }));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/orgs/test-org/repos?per_page=100",
      { headers: { Authorization: "Bearer org-token" } }
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/test-org/org-repo/languages",
      { headers: { Authorization: "Bearer org-token" } }
    );
  });

  it("trims whitespace from plain string entries in JSON array", async () => {
    vi.stubEnv("GITHUB_USERNAMES", '[" testuser "]');

    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/users/testuser/repos?per_page=100", {}
    );
  });

  it("handles unexpected pagination URL gracefully", async () => {
    mockFetch()
      .mockResolvedValueOnce(mockResponse(
        [{ name: "repo1", fork: false, full_name: "user/repo1" }],
        `<https://evil.com/repos>; rel="next"`
      ));

    const result = await fetchLanguageData();
    expect(result).toEqual({});
  });

  it("ignores whitespace-only tokens in JSON array", async () => {
    vi.stubEnv("GITHUB_USERNAMES", '[{"name": "testuser", "token": "   "}]');

    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/users/testuser/repos?per_page=100", {}
    );
  });

  it("returns stale cache on total fetch failure", async () => {
    mockFetch()
      .mockResolvedValueOnce(mockResponse([repos[0]]))
      .mockResolvedValueOnce(mockResponse(languages));

    await fetchLanguageData();

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000 * 60 * 61);

    mockFetch()
      .mockResolvedValueOnce(mockErrorResponse(500, "Internal Server Error"));

    const result = await fetchLanguageData();
    expect(result).toEqual({ JavaScript: 5000, Python: 3000, HTML: 2000 });

    vi.restoreAllMocks();
  });
});

describe("processLanguageData", () => {
  it("calculates percentages correctly", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000 };
    const result = processLanguageData(data, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ lang: "JavaScript", pct: 50 });
    expect(result[1]).toEqual({ lang: "Python", pct: 30 });
    expect(result[2]).toEqual({ lang: "HTML", pct: 20 });
  });

  it("sorts by percentage descending", () => {
    const data = { HTML: 1000, JavaScript: 5000, Python: 3000 };
    const result = processLanguageData(data, 3);

    expect(result.map(l => l.lang)).toEqual(["JavaScript", "Python", "HTML"]);
  });

  it("limits to count", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000, CSS: 1000 };
    const result = processLanguageData(data, 2);

    expect(result).toHaveLength(2);
    expect(result.map(l => l.lang)).toEqual(["JavaScript", "Python"]);
  });

  it("does not renormalize percentages after slicing", () => {
    const data = { JavaScript: 5000, Python: 3000, HTML: 2000 };
    const result = processLanguageData(data, 2);

    expect(result[0]).toEqual({ lang: "JavaScript", pct: 50 });
    expect(result[1]).toEqual({ lang: "Python", pct: 30 });

    const totalPct = result.reduce((sum, l) => sum + l.pct, 0);
    expect(totalPct).toBeCloseTo(80);
  });

  it("throws when no language data", () => {
    expect(() => processLanguageData({}, 5)).toThrow("No language data available");
  });
});
