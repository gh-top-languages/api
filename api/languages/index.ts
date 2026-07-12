import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleLanguages                    } from "../../src/handler.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { status, headers, body } = await handleLanguages(req.query);
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.status(status).send(body);
}
