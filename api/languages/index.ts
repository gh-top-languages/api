import type { VercelRequest, VercelResponse } from "../../src/vercel.js";
import { handleLanguages                    } from "../../src/handler.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { status, headers, body } = await handleLanguages(req.query, req.headers);
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.status(status).send(body);
}
