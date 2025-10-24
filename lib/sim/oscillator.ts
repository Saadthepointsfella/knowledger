// apps/web/lib/sim/oscillator.ts
import { computeTension } from "./equilibrium";
import { cosine } from "@/lib/cosine";

/**
 * Compute per-node instability σ_i = stddev(tensions on incident edges)
 */
export function nodeInstability(
  nodeId: string,
  edgesByNode: Record<string, { from: string; to: string; weight: number; type: string }[]>,
  vecs: Record<string, number[]>
): number {
  const edges = edgesByNode[nodeId] || [];
  if (edges.length === 0) return 0;

  const tensions: number[] = [];
  for (const e of edges) {
    const a = vecs[e.from];
    const b = vecs[e.to];
    if (!a || !b) continue;
    const t = computeTension(a, b, e.weight ?? 0);
    tensions.push(t);
  }
  if (tensions.length < 2) return 0;

  const mean = tensions.reduce((a, b) => a + b, 0) / tensions.length;
  const variance =
    tensions.reduce((a, b) => a + (b - mean) ** 2, 0) / tensions.length;
  return Math.sqrt(variance);
}

/**
 * Map instability → pulse frequency in Hz (0.5–2Hz)
 */
export function toPulseHz(instability: number, sensitivity: number): number {
  const scaled = Math.min(1, instability * sensitivity * 2);
  return 0.5 + 1.5 * scaled; // clamp to 0.5–2Hz
}

/**
 * Utility: create map of nodeId → Hz based on current sim snapshot
 */
export function computeOscillatorMap(
  nodes: Record<string, { vec: number[] }>,
  edges: { from: string; to: string; weight: number; type: string }[],
  sensitivity: number
): Record<string, number> {
  const edgesByNode: Record<string, any[]> = {};
  for (const e of edges) {
    (edgesByNode[e.from] ??= []).push(e);
    (edgesByNode[e.to] ??= []).push(e);
  }

  const hzMap: Record<string, number> = {};
  for (const id of Object.keys(nodes)) {
    const σ = nodeInstability(id, edgesByNode, Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, n.vec])));
    hzMap[id] = toPulseHz(σ, sensitivity);
  }
  return hzMap;
}
