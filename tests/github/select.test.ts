import { describe, it, expect } from "vitest";
import { detectMode, resolveSources, type Mode } from "../../src/github/select.js";

const personal:   Mode = { mode: "personal" };
const open:       Mode = { mode: "open" };
const enumerated: Mode = { mode: "enumerated", allowed: ["Mason", "acme"] };

describe("detectMode", () => {
  it("personal via GITHUB_USERNAMES",       () =>
    expect(detectMode({ GITHUB_USERNAMES: "a" })).toEqual(personal));
  it("personal via GITHUB_ORGS",            () =>
    expect(detectMode({ GITHUB_ORGS: "a" })).toEqual(personal));
  it("throws when both consumer vars set",  () =>
    expect(() => detectMode({ GITHUB_USERNAMES: "a", GITHUB_ALLOWED_SOURCES: "b" }))
    .toThrow(/cannot be combined/));
  it("throws when neither is set",          () =>
    expect(() => detectMode({})).toThrow(/Set GITHUB_USERNAMES/));
  it("treats whitespace-only vars as unset",() => expect(() =>
    detectMode({ GITHUB_USERNAMES: "  " })).toThrow(/Set GITHUB_USERNAMES/));
  it("* means open mode",                   () =>
    expect(detectMode({ GITHUB_ALLOWED_SOURCES: "*" })).toEqual(open));
  it("names mean enumerated mode",          () =>
    expect(detectMode({ GITHUB_ALLOWED_SOURCES: "Mason, acme" })).toEqual(enumerated));
  it("throws on invalid name in allowlist", () =>
    expect(() => detectMode({ GITHUB_ALLOWED_SOURCES: "ok,-bad-" })).toThrow(/not a valid/));
  it("throws on comma-only allowlist",      () =>
    expect(() => detectMode({ GITHUB_ALLOWED_SOURCES: ",," })).toThrow(/no valid entries/));
});

describe("resolveSources", () => {
  it("absent param → null in personal",       () =>
    expect(resolveSources(undefined, personal)).toBeNull());
  it("absent param → null in enumerated",     () =>
    expect(resolveSources(undefined, enumerated)).toBeNull());
  it("empty/degenerate param behaves as absent", () => {
    expect(resolveSources("", enumerated)).toBeNull();
    expect(resolveSources(" ,, ", enumerated)).toBeNull();
  });
  it("absent param → throws in open",         () =>
    expect(() => resolveSources(undefined, open)).toThrow(/requires \?source=/));
  it("any param → throws in personal",        () =>
    expect(() => resolveSources("mason", personal)).toThrow(/not enabled/));

  it("enumerated match is case-insensitive, returns canonical casing",
    () => expect(resolveSources("MASON,ACME", enumerated)).toEqual(["Mason", "acme"]));
  it("enumerated unknown name → throws",      () =>
    expect(() => resolveSources("stranger", enumerated)).toThrow(/Unknown or disallowed/));
  it("one bad among good fails the whole request",
    () => expect(() => resolveSources("Mason,stranger", enumerated)).toThrow(/Unknown or disallowed/));

  it("enumerated mode dedupes to one canonical entry", () => expect(resolveSources("Mason,MASON", enumerated)).toEqual(["Mason"]));
  it("open mode dedupes case-variant names", () => expect(resolveSources("Mason,mason,MASON", open)).toEqual(["mason"]));
  it("open passes valid names through",       () =>
    expect(resolveSources("a,b-c", open)).toEqual(["a", "b-c"]));
  it("open rejects more than 10 names",       () =>
    expect(() => resolveSources("a,b,c,d,e,f,g,h,i,j,k", open)).toThrow(/Too many/));
  it("open rejects malformed logins",         () => {
    expect(() => resolveSources("-bad-", open)).toThrow(/Invalid source name/);
    expect(() => resolveSources("a".repeat(40), open)).toThrow(/Invalid source name/);
    expect(() => resolveSources("double--hyphen", open)).toThrow(/Invalid source name/);
  });
});
