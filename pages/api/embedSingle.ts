import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "@/lib/env";
import { cfg } from "@/lib/cfg";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { text, model } = req.body as { text: string; model?: string };
    if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "text required" });

    const m = model || cfg.embed.model;
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ input: text, model: m }),
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: j?.error?.message || "openai error" });
    }
    const j = await r.json();
    const embedding = j.data?.[0]?.embedding;
    if (!embedding) return res.status(500).json({ error: "no embedding returned" });
    res.status(200).json({ embedding });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "unexpected" });
  }
}
