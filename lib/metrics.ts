import { Graph } from "./types";

/**
 * Compute full metrics bundle including Resonance Coefficient
 */
export function metricsBundle(
  g: Graph,
  clusters: number
): {
  nodeCount: number;
  edgeCount: number;
  clusters: number;
  avgSim: number;
  RC: number;
} {
  const nodeCount = g.nodes.length;
  const edgeCount = g.edges.length;

  // Average similarity
  const weights = g.edges.map((e) => e.weight);
  const avgSim = weights.length
    ? weights.reduce((a, b) => a + b, 0) / weights.length
    : 0;

  // Resonance Coefficient (MVP approximation using community structure)
  // RC = ratio of intra-community edges to total edges (weighted)
  let intraWeight = 0;
  let totalWeight = 0;

  g.edges.forEach((e) => {
    const sourceNode = g.nodes.find((n) => n.id === e.source);
    const targetNode = g.nodes.find((n) => n.id === e.target);
    const w = e.weight;

    totalWeight += w;
    if (
      sourceNode &&
      targetNode &&
      sourceNode.community === targetNode.community
    ) {
      intraWeight += w;
    }
  });

  const RC = totalWeight > 0 ? intraWeight / totalWeight : 0;

  return {
    nodeCount,
    edgeCount,
    clusters,
    avgSim,
    RC,
  };
}
