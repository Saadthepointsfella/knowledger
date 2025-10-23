// apps/web/workers/simtension.worker.ts
import { simTick } from "@/lib/sim/equilibrium";

self.onmessage = (e) => {
  const { nodes, edges, params } = e.data;
  try {
    const res = simTick(nodes, edges, params);
    self.postMessage(res);
  } catch (err) {
    console.error("simtension.worker error:", err);
    self.postMessage({ error: String(err) });
  }
};
