import type { NextApiRequest, NextApiResponse } from "next";
import { cfg } from "@/lib/cfg";
import { naiveSentenceSplit } from "@/lib/chunk";
import { computeLouvain } from "@/lib/cluster";
import { projectVectors } from "@/lib/project";
import { cosine } from "@/lib/cosine";

// Reuse existing /api/embed for batching to keep code small
async function embedMany(chunks: string[]) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chunks, model: cfg.embed.model, batchSize: cfg.embed.batchSize }),
  });
  if (!r.ok) {
    const j = await r.json().catch(()=>({}));
    throw new Error(j?.error || j?.message || `embed failed ${r.status}`);
  }
  const j = await r.json();
  return j.embeddings as number[][];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
    const text = String(req.query.text || "");
    if (!text.trim()) return res.status(400).json({ error: "text required" });

    // 1) chunk + embed
    const chunks = naiveSentenceSplit(text).map(c => c.text).filter(Boolean);
    const embeddings = await embedMany(chunks);

    // 2) project not strictly needed; build a tiny graph via existing /api/analyze route
    const an = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: chunks,
        embeddings,
        params: { k: cfg.graph.kDesktop, threshold: cfg.graph.simThreshold },
      }),
    });
    if (!an.ok) {
      const j = await an.json().catch(()=>({}));
      return res.status(an.status).json({ error: j?.error || j?.message || "analyze failed" });
    }
    const { graph } = await an.json();

    // 3) Louvain to get communities & centroids
    const { graph: withCom } = computeLouvain(graph, 1.0);

    // compute global centroid
    const d = embeddings[0]?.length || 0;
    const globalCent = new Array(d).fill(0);
    embeddings.forEach(v => { for (let i=0;i<d;i++) globalCent[i]+=v[i]||0; });
    for (let i=0;i<d;i++) globalCent[i]/=Math.max(1, embeddings.length);

    // find best cluster by rep closeness
    const byCom: Record<number, number[][]> = {};
    withCom.nodes.forEach((n: any, idx: number) => {
      const cid = typeof n.community === "number" ? n.community : -1;
      if (!byCom[cid]) byCom[cid] = [];
      byCom[cid].push(embeddings[idx]);
    });

    function centroid(vs: number[][]) {
      const c = new Array(d).fill(0);
      if (!vs.length) return c;
      vs.forEach(v => { for (let i=0;i<d;i++) c[i]+=v[i]||0; });
      for (let i=0;i<d;i++) c[i]/=vs.length;
      return c;
    }

    const comCent: Record<number, number[]> = {};
    for (const [cid, vs] of Object.entries(byCom)) comCent[+cid] = centroid(vs);

    // use first chunk as the "query" vector
    const q = embeddings[0] || globalCent;
    let clusterId = -1, best = -2;
    for (const [cid, cent] of Object.entries(comCent)) {
      const sim = cosine(q, cent);
      if (sim > best) { best = sim; clusterId = +cid; }
    }

    const r_global = (cosine(q, globalCent) + 1) / 2;
    const r_cluster = (cosine(q, comCent[clusterId] || globalCent) + 1) / 2;

    // tension estimate: compare to k nearest within cluster iff edges exist
    const memberIdxs = withCom.nodes
      .map((n: any, i: number) => ({ i, c: n.community }))
      .filter(o => o.c === clusterId)
      .map(o => o.i);

    let tension_estimate = 0;
    if (memberIdxs.length > 1) {
      // naive: average |cos(q, v) - (cos(q,v))| → zero if we don't have stored weights
      // Better proxy: mean(1 - cos(q, v)) for cluster members (normalized to [0..1])
      const sims = memberIdxs.map(i => (cosine(q, embeddings[i]) + 1) / 2);
      const meanSim = sims.reduce((a,b)=>a+b,0) / sims.length;
      tension_estimate = Math.max(0, 1 - meanSim);
    }

    return res.status(200).json({
      input: text,
      clusterId,
      r_global: Number(r_global.toFixed(4)),
      r_cluster: Number(r_cluster.toFixed(4)),
      tension_estimate: Number(tension_estimate.toFixed(4)),
      version: "3.0.0",
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "unexpected" });
  }
}
