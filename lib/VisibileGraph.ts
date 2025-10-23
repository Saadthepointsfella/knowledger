// apps/web/lib/visibleGraph.ts
import { Graph } from "./types";
import { cfg } from "./cfg";

/**
 * Returns a graph filtered for visualization:
 * - Optional community filter (only nodes/edges within communityId)
 * - Edge cap: keep strongest edges first up to cfg.graph.maxLiveEdges
 */
export function makeVisibleGraph(
  g: Graph,
  opts: { communityId: number | null }
): Graph {
  const { communityId } = opts;

  if (!g.nodes.length) return g;

  const nodeAllow = new Set<string>();
  if (communityId === null) {
    for (const n of g.nodes) nodeAllow.add(n.id);
  } else {
    for (const n of g.nodes) if (n.community === communityId) nodeAllow.add(n.id);
  }

  const nodes = g.nodes.filter(n => nodeAllow.has(n.id));

  // Keep only edges whose both ends are allowed
  let edges = g.edges.filter(e => nodeAllow.has(String(e.source)) && nodeAllow.has(String(e.target)));

  // Cap edges by descending weight
  const MAX = cfg.graph.maxLiveEdges;
  if (edges.length > MAX) {
    edges = edges
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX);
  }

  return { nodes, edges };
}
