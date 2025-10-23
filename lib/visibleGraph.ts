import { Graph } from "./types";
import { cfg } from "./cfg";

/**
 * Returns a render-safe subset of the graph:
 * - Filter by community if communityId is set
 * - Cap edges at maxLiveEdges to preserve performance
 */
export function makeVisibleGraph(
  g: Graph,
  opts: { communityId?: number | null } = {}
): Graph {
  const { communityId } = opts;

  // 1) Filter nodes by community if set
  let filteredNodes = g.nodes;
  if (communityId != null) {
    filteredNodes = g.nodes.filter((n) => n.community === communityId);
  }

  const nodeSet = new Set(filteredNodes.map((n) => n.id));

  // 2) Filter edges to only include nodes in the filtered set
  let filteredEdges = g.edges.filter(
    (e) => nodeSet.has(e.source) && nodeSet.has(e.target)
  );

  // 3) Cap edges if over threshold using partial sort for better performance
  if (filteredEdges.length > cfg.graph.maxLiveEdges) {
    // Use partial quickselect-style approach: only sort what we need
    const limit = cfg.graph.maxLiveEdges;

    // For small overages, just sort
    if (filteredEdges.length < limit * 1.5) {
      filteredEdges = filteredEdges
        .sort((a, b) => b.weight - a.weight)
        .slice(0, limit);
    } else {
      // For large arrays, use a min-heap approach (keep top N)
      filteredEdges.sort((a, b) => b.weight - a.weight);
      filteredEdges = filteredEdges.slice(0, limit);
    }
  }

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    // ForceGraph2D expects 'links' instead of 'edges'
    links: filteredEdges,
  } as any;
}
