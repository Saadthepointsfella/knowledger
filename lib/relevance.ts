import type { Graph } from "@/lib/types";
import { cosine } from "@/lib/cosine";
import type { NodeData } from "@/state/graphStore";

/** average of vectors */
function centroid(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dim = vectors[0]?.length || 0;
  const c = new Array(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i++) c[i] += v[i] || 0;
  for (let i = 0; i < dim; i++) c[i] /= vectors.length;
  return c;
}

/**
 * Compute relevance directly from embeddings.
 * - r_global  = cosine(node.vec, global centroid)
 * - r_cluster = cosine(node.vec, centroid of its community in the proximity graph)
 * Values are returned in [0..1] via (cos+1)/2 for readability.
 */
export function computeEmbeddingRelevance(
  proximityGraph: Graph,
  nodes: Record<string, NodeData>
): { r_global: Record<string, number>; r_cluster: Record<string, number> } {
  // map ids from proximityGraph -> store ids
  const ids = proximityGraph.nodes.map((n: any) => String(n.__nid ?? n.id));
  const vecs = ids.map((id) => nodes[id]?.vec || []).filter((v) => v.length);
  const gCent = centroid(vecs);

  const r_global: Record<string, number> = {};
  for (const id of ids) {
    const v = nodes[id]?.vec || [];
    const c = v.length && gCent.length ? cosine(v, gCent) : 0;
    r_global[id] = (c + 1) / 2; // [-1..1] -> [0..1]
  }

  // community centroids
  const byCom: Record<number, number[][]> = {};
  proximityGraph.nodes.forEach((n: any) => {
    const id = String(n.__nid ?? n.id);
    const com = typeof n.community === "number" ? n.community : -1;
    if (!byCom[com]) byCom[com] = [];
    const v = nodes[id]?.vec || [];
    if (v.length) byCom[com].push(v);
  });

  const comCent: Record<number, number[]> = {};
  for (const [k, arr] of Object.entries(byCom)) comCent[+k] = centroid(arr);

  const r_cluster: Record<string, number> = {};
  proximityGraph.nodes.forEach((n: any) => {
    const id = String(n.__nid ?? n.id);
    const com = typeof n.community === "number" ? n.community : -1;
    const v = nodes[id]?.vec || [];
    const c = v.length && comCent[com]?.length ? cosine(v, comCent[com]) : 0;
    r_cluster[id] = (c + 1) / 2;
  });

  return { r_global, r_cluster };
}
