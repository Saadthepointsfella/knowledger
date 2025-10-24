// apps/web/lib/tsneClient.ts

export async function tsneProject(
  vectors: number[][],
  opts: { dim: 2 | 3; perplexity: number; iterations: number; seed: number }
): Promise<number[][]> {
  // Dynamic import only on client side
  if (typeof window === "undefined") {
    // Server-side fallback: circular layout
    return vectors.map((_, i) => {
      const angle = (i / vectors.length) * 2 * Math.PI;
      const radius = 50 + Math.random() * 50;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    });
  }

  return new Promise(async (resolve) => {
    try {
      // @ts-ignore
      const TSNE = (await import("tsne-js")).default;

      const model = new TSNE({
        dim: opts.dim,
        perplexity: opts.perplexity,
        earlyExaggeration: 4.0,
        learningRate: 100.0,
        nIter: opts.iterations,
      });

      model.init({ data: vectors, type: "dense" });
      model.run();
      let coords = model.getOutputScaled();

      // Normalize coordinates to fit better in viewport
      // Scale to roughly -200 to +200 range
      const maxVal = Math.max(...coords.flat().map(Math.abs));
      if (maxVal > 0) {
        coords = coords.map((c: number[]) => c.map((v: number) => (v / maxVal) * 200));
      }

      resolve(coords);
    } catch (error) {
      // Fallback to circular layout if t-SNE fails
      console.error("t-SNE failed, using circular layout:", error);
      const coords = vectors.map((_, i) => {
        const angle = (i / vectors.length) * 2 * Math.PI;
        const radius = 50 + Math.random() * 50;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
      });
      resolve(coords);
    }
  });
}
