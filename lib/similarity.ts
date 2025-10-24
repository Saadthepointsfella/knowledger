// cosine + helpers + worker wrapper for batch similarities
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

export function cos01(a: number[], b: number[]): number {
  return (cosine(a, b) + 1) / 2; // [-1,1] → [0,1]
}

/** Lazy worker loader */
let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) worker = new Worker(new URL("../workers/similarity.worker.ts", import.meta.url));
  return worker;
}

export function batchCosine(base: number[], vectors: number[]): Promise<Float32Array> {
  // vectors is flattened (len = d * N)
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const onMessage = (e: MessageEvent) => {
      resolve(e.data as Float32Array);
      w.removeEventListener("message", onMessage);
    };
    const onError = (err: any) => {
      reject(err);
      w.removeEventListener("error", onError);
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ base, vectors });
  });
}
