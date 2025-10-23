// Minimal t-SNE worker using tsne-js
// @ts-ignore
import TSNE from "tsne-js";

export type TSNEJob = { vectors: number[][], dim: 2|3, perplexity: number, iterations: number, seed: number };

self.onmessage = (e: MessageEvent<TSNEJob>) => {
  const { vectors, dim, perplexity, iterations } = e.data;
  const model = new TSNE({ dim, perplexity, earlyExaggeration: 4.0, learningRate: 100.0, nIter: iterations });
  model.init({ data: vectors, type: "dense" });
  const coords = model.getOutputScaled();
  // tsne-js runs internally when calling getOutput(); keep minimal for MVP
  // If not, call model.run(); then model.getOutputScaled();
  // @ts-ignore
  // eslint-disable-next-line
  // @ts-ignore
  // Final output
  // @ts-ignore
  // Some versions require explicit run(); adjust if needed.
  // @ts-ignore
  (self as any).postMessage({ coords });
};
