// apps/web/lib/cluster.ts
import Graphology from "graphology";
import louvain from "graphology-communities-louvain";
import { Graph as KRGraph } from "./types";

export type CommunityResult = {
  graph: KRGraph;
  clusters: number;
  communities: Record<string, number>;
};

export function computeLouvain(input: KRGraph, resolution = 1.0): CommunityResult {
  // Build graphology graph
  const g = new (Graphology as any)({ type: "undirected", multi: false, allowSelfLoops: false });

  input.nodes.forEach(n => g.addNode(n.id, { text: (n as any).text }));
  input.edges.forEach(e => {
    // guard against duplicate edges
    if (!g.hasEdge(e.source, e.target) && e.source !== e.target) {
      g.addEdge(e.source, e.target, { weight: e.weight });
    }
  });

  // Run Louvain — writes `community` attribute on nodes
  louvain.assign(g, { resolution, getEdgeWeight: "weight" });

  // Extract communities & decorate nodes
  const communities: Record<string, number> = {};
  const seen = new Set<number>();

  const nodes = input.nodes.map(n => {
    const comm: number = g.getNodeAttribute(n.id, "community");
    communities[n.id] = comm;
    seen.add(comm);
    return { ...n, community: comm };
  });

  const graph: KRGraph = { nodes, edges: input.edges };
  return { graph, clusters: seen.size, communities };
}
