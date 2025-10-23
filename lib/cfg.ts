export const cfg = {
  chunk: { targetChars: 400, overlap: 60, mode: "sentence" as const },
  embed: { model: "text-embedding-3-small", batchSize: 64, cacheTTLdays: 90, retries: [1,2,4,8] },
  project: {
    defaultAlgo: "tsne" as const,
    tsne: { dim: 2, perplexity: 40, iterations: 600, seed: 42, maxClientNodes: 400 },
    umap: { nNeighbors: 15, minDist: 0.1, dim: 2, seed: 42 }
  },
  graph: { kDesktop: 7, kMobile: 5, simThreshold: 0.7, maxLiveEdges: 1000 },
  louvain: { resolution: 1.0, maxIter: 100 },
  ui: { fpsTarget: 60, phaseTimeoutMs: 4000 }
};
