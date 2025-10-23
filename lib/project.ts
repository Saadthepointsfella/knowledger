// apps/web/lib/project.ts
import { cfg } from "./cfg";
import { ENV } from "./env";
import { tsneProject } from "./tsneClient";

/**
 * Projects high-dim vectors to 2D/3D based on spec rules:
 * - Client t-SNE (web worker) when N <= cfg.project.tsne.maxClientNodes
 * - Server UMAP (FastAPI) when N > threshold and PROJECT_API is set
 * If server URL is missing, falls back to client t-SNE.
 */
export async function projectVectors(
  vectors: number[][], // shape: N x D
): Promise<{ coords: number[][]; via: "tsne-client" | "umap-server" }> {
  const N = vectors.length;
  const useClient =
    N <= cfg.project.tsne.maxClientNodes || !ENV.PROJECT_API;

  if (useClient) {
    const coords = await tsneProject(vectors, {
      dim: cfg.project.tsne.dim,
      perplexity: cfg.project.tsne.perplexity,
      iterations: cfg.project.tsne.iterations,
      seed: cfg.project.tsne.seed,
    });
    return { coords, via: "tsne-client" };
  }

  // Server UMAP path
  const resp = await fetch(ENV.PROJECT_API!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vectors,
      algo: "umap",
      dim: cfg.project.umap.dim,
      seed: cfg.project.umap.seed,
    }),
  });

  if (!resp.ok) {
    // Fallback to client on failure
    const coords = await tsneProject(vectors, {
      dim: cfg.project.tsne.dim,
      perplexity: cfg.project.tsne.perplexity,
      iterations: cfg.project.tsne.iterations,
      seed: cfg.project.tsne.seed,
    });
    return { coords, via: "tsne-client" };
  }

  const { coords } = (await resp.json()) as { coords: number[][] };
  return { coords, via: "umap-server" };
}
