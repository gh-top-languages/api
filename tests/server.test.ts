import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { once             } from "node:events";
import type { Server      } from "node:http";
import type { AddressInfo } from "node:net";
import { startServer      } from "../src/server.js";

let server: Server;
let base: string;

beforeAll(async () => {
  server = startServer(0);
  await once(server, "listening");
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve, reject) =>
  server.close(err => err ? reject(err) : resolve())
));

describe("node http server", () => {
  it("serves an SVG chart at /api/languages", async () => {
    const res = await fetch(`${base}/api/languages?test=true`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    expect(await res.text()).toContain("<svg");
  });

  it("returns 404 for unknown paths", async () => {
    const res = await fetch(`${base}/nope`);
    expect(res.status).toBe(404);
  });

  it("takes the first value of duplicated query params", async () => {
    const res = await fetch(`${base}/api/languages?test=true&bg=ff0000&bg=00ff00`);
    const body = await res.text();
    expect(body).toContain('fill="#ff0000"');
    expect(body).not.toContain('fill="#00ff00"');
  });

  it("renders error param escaped exactly once", async () => {
    const res = await fetch(`${base}/api/languages?error=${encodeURIComponent('<b>"hi"')}`);
    const body = await res.text();
    expect(body).toContain("&lt;b&gt;&quot;hi&quot;");
    expect(body).not.toContain("&amp;lt;");
  });
});
