import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleLanguages } from "../src/handler.js";
import { resetCache      } from "../src/github/fetch.js";

describe("handleLanguages", () => {
  it("takes the first value when a query param is supplied as an array", async () => {
    const res = await handleLanguages({ test: "true", bg: ["ff0000", "00ff00"] });
    expect(res.status).toBe(200);
    expect(res.body).toContain('fill="#ff0000"');
  });
});

describe("source selection", () => {
  const mockGitHub = (sources: Record<string, Record<string, number> | number>) => {
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      for (const [name, langs] of Object.entries(sources)) {
        if (u.includes(`/users/${name}/repos`)) {
          if (typeof langs === "number") return { ok: false, status: langs, statusText: "", headers: { get: () => null } } as unknown as Response;
          return { ok: true, json: async () => [{ name: `${name}-repo`, fork: false, full_name: `${name}/${name}-repo` }], headers: { get: () => null } } as unknown as Response;
        }
        if (u.includes(`/repos/${name}/`)) return { ok: true, json: async () => langs, headers: { get: () => null } } as unknown as Response;
      }
      throw new Error(`unexpected fetch: ${u}`);
    }) as typeof fetch;
  };

  beforeEach(() => {
    resetCache();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("personal mode rejects ?source=", async () => {
    vi.stubEnv("GITHUB_USERNAMES", "me");
    const res = await handleLanguages({ source: "other" });
    expect(res.headers["X-Chart-Error"]).toBe("true");
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
  });

  it("enumerated bare URL renders the aggregate", async () => {
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "alice,bob");
    mockGitHub({ alice: { Rust: 9000 }, bob: { Go: 8000 } });
    const res = await handleLanguages({});
    expect(res.headers["X-Chart-Error"]).toBeUndefined();
    expect(res.body).toContain("Rust");
    expect(res.body).toContain("Go");
  });

  it("enumerated ?source= renders only the selected source", async () => {
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "alice,bob");
    mockGitHub({ alice: { Rust: 9000 }, bob: { Go: 8000 } });
    const res = await handleLanguages({ source: "alice" });
    expect(res.body).toContain("Rust");
    expect(res.body).not.toContain("Go");
  });

  it("enumerated unknown source renders a cacheable error SVG", async () => {
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "alice");
    const res = await handleLanguages({ source: "stranger" });
    expect(res.headers["X-Chart-Error"]).toBe("true");
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
    expect(res.body).not.toContain("stranger");
  });

  it("open bare URL renders a cacheable error SVG", async () => {
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "*");
    const res = await handleLanguages({});
    expect(res.headers["X-Chart-Error"]).toBe("true");
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
  });

  it("open ?source= hitting a GitHub 404 renders a cacheable error SVG", async () => {
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "*");
    mockGitHub({ ghost: 404 });
    const res = await handleLanguages({ source: "ghost" });
    expect(res.headers["X-Chart-Error"]).toBe("true");
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
  });

  it("open mode rejects more than 10 sources", async () => {
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "*");
    const res = await handleLanguages({ source: "a,b,c,d,e,f,g,h,i,j,k" });
    expect(res.headers["X-Chart-Error"]).toBe("true");
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
  });

  it("both consumer vars set is a server-side error, not cacheable", async () => {
    vi.stubEnv("GITHUB_USERNAMES", "me");
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "alice");
    const res = await handleLanguages({});
    expect(res.headers["X-Chart-Error"]).toBe("true");
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

    it("duplicate names in ?source= are counted once", async () => {
    vi.stubEnv("GITHUB_ALLOWED_SOURCES", "*");
    mockGitHub({ alice: { Rust: 9000 } });
    const res = await handleLanguages({ source: "alice,alice" });
    expect(res.headers["X-Chart-Error"]).toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("referer gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("unset ALLOWED_REFERERS leaves the instance open", async () => {
    const res = await handleLanguages({ test: "true" });
    expect(res.headers["X-Chart-Error"]).toBeUndefined();
  });

  it("matching origin passes", async () => {
    vi.stubEnv("ALLOWED_REFERERS", "builder.example.com");
    const res = await handleLanguages({ test: "true" }, { origin: "https://builder.example.com" });
    expect(res.headers["X-Chart-Error"]).toBeUndefined();
  });

  it("matching referer passes when origin is absent", async () => {
    vi.stubEnv("ALLOWED_REFERERS", "builder.example.com");
    const res = await handleLanguages({ test: "true" }, { referer: "https://builder.example.com/builder?theme=dark" });
    expect(res.headers["X-Chart-Error"]).toBeUndefined();
  });

  it("foreign referer is blocked with a cacheable error", async () => {
    vi.stubEnv("ALLOWED_REFERERS", "builder.example.com");
    const res = await handleLanguages({ test: "true" }, { referer: "https://freeloader.example.com/" });
    expect(res.headers["X-Chart-Error"]).toBe("true");
    expect(res.headers["Cache-Control"]).toBe("public, max-age=300");
  });

  it("missing referer is blocked (camo/hotlink case)", async () => {
    vi.stubEnv("ALLOWED_REFERERS", "builder.example.com");
    const res = await handleLanguages({ test: "true" });
    expect(res.headers["X-Chart-Error"]).toBe("true");
  });

  it("substring lookalike host is blocked", async () => {
    vi.stubEnv("ALLOWED_REFERERS", "builder.example.com");
    const res = await handleLanguages({ test: "true" }, { referer: "https://builder.example.com.evil.com/" });
    expect(res.headers["X-Chart-Error"]).toBe("true");
  });
});
