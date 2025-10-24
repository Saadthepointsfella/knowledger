import type { NextApiRequest, NextApiResponse } from "next";
import { knnGraph, metricsFromGraph, resonanceCoefficient } from "@/lib/graph";

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
  const { texts, embeddings, params } = req.body as { texts: string[]; embeddings: number[][]; params: { k: number; threshold: number } };
  if (!texts?.length || !embeddings?.length) return res.status(400).json({ error: "invalid" });
  const g = knnGraph(texts, embeddings, params.k, params.threshold);
  const base = metricsFromGraph(g);
  const RC = resonanceCoefficient(g);
  res.json({ graph: g, metrics: { ...base, RC, clusters: 0, elapsed: {} } });
}
