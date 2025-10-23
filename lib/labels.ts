// apps/web/lib/labels.ts
import { Graph } from "./types";
import { buildCorpusStats, labelFromClusterDocs } from "./topic";

/**
 * Compute semantic labels for communities (no LLM).
 * @param g Graph with community ids on nodes
 * @param textsById map of node.id -> original text
 * @returns labels map: communityId -> label
 */
export function computeCommunityLabels(
  g: Graph,
  textsById: Map<string, string>,
): Record<number, string> {
  // Build global corpus once
  const allDocs: string[] = [];
  for (const n of g.nodes) {
    const t = textsById.get(n.id);
    if (t) allDocs.push(t);
  }
  const corpus = buildCorpusStats(allDocs);

  // Group docs by community
  const clusterDocs = new Map<number, string[]>();
  for (const n of g.nodes) {
    const cid = (n as any).community as number | undefined;
    if (cid === undefined) continue;
    const t = textsById.get(n.id);
    if (!t) continue;
    const arr = clusterDocs.get(cid) || [];
    arr.push(t);
    clusterDocs.set(cid, arr);
  }

  // Label each community
  const labels: Record<number, string> = {};
  for (const [cid, docs] of clusterDocs.entries()) {
    labels[cid] = labelFromClusterDocs(docs, corpus, 3);
  }
  return labels;
}
