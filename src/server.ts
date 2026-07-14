import { createServer, type Server      } from "node:http";
import { pathToFileURL                  } from "node:url";
import { handleLanguages, type RawQuery } from "./handler.js";

export function queryFromUrl(url: URL): RawQuery {
  const query: RawQuery = {};
  for (const [key, value] of url.searchParams) if (!(key in query)) query[key] = value;
  return query;
}

export function startServer(port: number): Server {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (url.pathname !== "/api/languages") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
        return;
      }

      const { status, headers, body } = await handleLanguages(queryFromUrl(url), req.headers as RawQuery);
      res.writeHead(status, headers);
      res.end(body);
    } catch {
      if (!res.headersSent) res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
    }
  }).listen(port);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number.parseInt(process.env["PORT"] ?? "3000", 10);
  startServer(port).on("listening", () =>
    console.log(`gh-top-languages api listening on http://localhost:${port}/api/languages`)
  );
}
