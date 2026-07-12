import { describe, it, expect } from "vitest";
import { handleLanguages      } from "../src/handler.js";

describe("handleLanguages", () => {
  it("takes the first value when a query param is supplied as an array", async () => {
    const res = await handleLanguages({ test: "true", bg: ["ff0000", "00ff00"] });
    expect(res.status).toBe(200);
    expect(res.body).toContain('fill="#ff0000"');
  });
});
