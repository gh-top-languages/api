import { describe, it, expect } from "vitest";
import { sanitize } from "../../src/utils/sanitize.js";

describe("sanitize", () => {
  it("returns empty string for non-strings", () => {
    expect(sanitize(null)).toBe("");
    expect(sanitize(undefined)).toBe("");
    expect(sanitize(123)).toBe("");
    expect(sanitize({})).toBe("");
    expect(sanitize([])).toBe("");
  });

  it("escapes the criticial HTML characters", () => {
    expect(sanitize(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("leaves safe strings unchanged", () => {
    expect(sanitize("Hello world")).toBe("Hello world");
  });

  it("escapes mixed content correctly", () => {
    expect(sanitize(`Hi <Mason> & "team"`)).toBe("Hi &lt;Mason&gt; &amp; &quot;team&quot;");
  });
});
