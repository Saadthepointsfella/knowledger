// apps/web/lib/sim/equilibrium.ts
import { cosine } from "@/lib/cosine";
import { EDGE_TYPE_POLARITY } from "@/models/edgeTypes";

/**
 * Simulation parameter configuration
 */
export type SimParams = {
  epsilon: number;        // convergence threshold
  maxTicks: number;       // max iterations
  step: number;           // movement scale per tick
  damping: number;        // 0.0–1.0 friction
  bounds: { x: number; y: number }; // layout limits
};

/**
 * Compute absolute tension between expected and actual semantic alignment.
 */
export function computeTension(a: number[], b: number[], w: number): number {
  if (!a.length || !b.length) return 0;
  return Math.abs(cosine(a, b) - (w ?? 0));
}

/**
 * Run one tick of the semantic equilibrium simulation.
 * Adjusts positions to minimize tension_ij across edges.
 */
export function simTick(
  nodes: Record<string, { x: number; y: number; vec: number[] }>,
  edges: {
    id: string;
    from: string;
    to: string;
    type: string;
    weight: number;
  }[],
  params: SimParams
): { avgTension: number; positions: Record<string, { x: number; y: number }> } {
  const deltas: Record<string, { dx: number; dy: number }> = {};
  let totalTension = 0;
  let count = 0;

  for (const e of edges) {
    const ni = nodes[e.from];
    const nj = nodes[e.to];
    if (!ni || !nj) continue;

    const t = computeTension(ni.vec, nj.vec, e.weight ?? 0);
    totalTension += t;
    count++;

    const polarity = EDGE_TYPE_POLARITY[e.type as keyof typeof EDGE_TYPE_POLARITY] ?? 0;
    const dx = nj.x - ni.x;
    const dy = nj.y - ni.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const ux = dx / dist;
    const uy = dy / dist;

    // Signed influence: supportive pulls, conflicting pushes
    const k = t * (1 + 0.5 * polarity);

    deltas[e.from] ??= { dx: 0, dy: 0 };
    deltas[e.to] ??= { dx: 0, dy: 0 };

    deltas[e.from].dx += k * ux;
    deltas[e.from].dy += k * uy;
    deltas[e.to].dx -= k * ux;
    deltas[e.to].dy -= k * uy;
  }

  const avgTension = count ? totalTension / count : 0;
  const positions: Record<string, { x: number; y: number }> = {};

  for (const [id, n] of Object.entries(nodes)) {
    const d = deltas[id];
    if (!d) continue;
    const nx = n.x + params.step * d.dx * params.damping;
    const ny = n.y + params.step * d.dy * params.damping;

    // Clamp to layout bounds
    const cx = Math.max(-params.bounds.x, Math.min(params.bounds.x, nx));
    const cy = Math.max(-params.bounds.y, Math.min(params.bounds.y, ny));

    positions[id] = { x: cx, y: cy };
  }

  return { avgTension, positions };
}
