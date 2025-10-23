import { Graph, Node, Edge } from "./types";
import { cosine } from "./cosine";

export function knnGraph(texts: string[], embeddings: number[][], k: number, threshold: number): Graph {
  const nodes: Node[] = texts.map((t, i) => ({ id: String(i), text: t }));
  const edges: Edge[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    const sims: { j: number; w: number }[] = [];
    for (let j = 0; j < embeddings.length; j++) {
      if (i === j) continue;
      const w = cosine(embeddings[i], embeddings[j]);
      sims.push({ j, w });
    }
    sims.sort((a, b) => b.w - a.w);
    let added = 0;
    for (const s of sims) {
      if (s.w < threshold) break;
      edges.push({ source: String(i), target: String(s.j), weight: s.w });
      if (++added >= k) break;
    }
  }
  return { nodes, edges };
}

export function metricsFromGraph(g: Graph) {
  const weights = g.edges.map(e => e.weight);
  const avgSim = weights.length ? weights.reduce((a,b)=>a+b,0)/weights.length : 0;
  return { avgSim, nodeCount: g.nodes.length, edgeCount: g.edges.length };
}

export function resonanceCoefficient(g: Graph): number {
  // Approximate RC using edge-weighted intra vs inter from simple community labels if present.
  // MVP: without communities yet, return scaled avgSim; upgraded once communities computed client-side.
  const m = metricsFromGraph(g);
  return Math.max(0, Math.min(1, m.avgSim));
}
