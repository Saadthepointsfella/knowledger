import type { Graph } from "@/lib/types";
import type { NodeData } from "@/state/graphStore";
import { cosine } from "@/lib/cosine";

const STOP = new Set([
  "the","a","an","and","or","but","if","so","that","this","of","in","on","for","to","with","by",
  "is","are","was","were","be","as","it","at","from","we","you","they","i","me","my","our","your","their",
]);

function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(t => t && !STOP.has(t) && t.length > 2);
}

function centroid(vecs: number[][]): number[] {
  if (!vecs.length) return [];
  const d = vecs[0]?.length || 0;
  const c = new Array(d).fill(0);
  for (const v of vecs) for (let i=0;i<d;i++) c[i]+=v[i]||0;
  for (let i=0;i<d;i++) c[i]/=vecs.length;
  return c;
}

export type ClusterSummary = {
  community: number;
  size: number;
  keywords: string[];
  representatives: { id: string; text: string; score: number }[];
  centroid: number[];
};

export function summarizeCommunity(
  communityId: number,
  proximityGraph: Graph,
  nodes: Record<string, NodeData>
): ClusterSummary {
  const memberIds = proximityGraph.nodes
    .filter((n: any) => n.community === communityId)
    .map((n: any) => String(n.__nid ?? n.id));

  const texts = memberIds.map(id => nodes[id]?.text || "");
  const vecs = memberIds.map(id => nodes[id]?.vec || []).filter(v => v.length);
  const cent = centroid(vecs);

  // TF-IDF within community
  const docs = texts.map(t => tokenize(t));
  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set(d);
    for (const tok of seen) df.set(tok, (df.get(tok) || 0) + 1);
  }
  const N = docs.length || 1;
  const tfidf = new Map<string, number>();
  for (const d of docs) {
    const tf = new Map<string, number>();
    for (const tok of d) tf.set(tok, (tf.get(tok) || 0) + 1);
    for (const [tok, freq] of tf) {
      const idf = Math.log((N + 1) / ((df.get(tok) || 0) + 1)) + 1;
      tfidf.set(tok, (tfidf.get(tok) || 0) + freq * idf);
    }
  }
  const keywords = Array.from(tfidf.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t])=>t);

  const reps = memberIds
    .map(id => {
      const v = nodes[id]?.vec || [];
      const score = cent.length && v.length ? cosine(v, cent) : -1;
      return { id, text: nodes[id]?.text || "", score };
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,3);

  return { community: communityId, size: memberIds.length, keywords, representatives: reps, centroid: cent };
}
