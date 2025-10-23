import type { NextApiRequest, NextApiResponse } from "next";
import { createHash } from "crypto";
import { Redis } from "@upstash/redis";
import OpenAI from "openai";

const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! }) : null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function keyFor(model: string, text: string) {
  return `emb:${model}:${createHash("sha256").update(text).digest("hex")}`;
}

// Increase body size limit to 10MB for large text dumps
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { chunks, model = "text-embedding-3-small", batchSize = 64 } = req.body as { chunks: string[]; model: string; batchSize?: number };
  if (!Array.isArray(chunks) || chunks.length === 0) return res.status(400).json({ error: "no chunks" });

  const embeddings: number[][] = [];
  let cached = 0;

  const getOne = async (t: string) => {
    const k = keyFor(model, t);
    if (redis) {
      const hit = await redis.get<number[]>(k);
      if (hit) { cached++; return hit; }
    }
    const resp = await openai.embeddings.create({ model, input: t });
    const vec = resp.data[0].embedding as unknown as number[];
    if (redis) await redis.setex(k, 60 * 60 * 24 * 90, vec);
    return vec;
  };

  // simple batching
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    const vecs = await Promise.all(slice.map(getOne));
    embeddings.push(...vecs);
  }

  res.json({ embeddings, cached });
}
