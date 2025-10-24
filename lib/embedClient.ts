// apps/web/lib/embedClient.ts
// Client-side embedding generation using Transformers.js
import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';

// Configure to use browser-based ONNX Runtime (not Node.js)
if (typeof window !== 'undefined') {
  env.backends.onnx.wasm.numThreads = 1;
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
}

let extractor: FeatureExtractionPipeline | null = null;
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Initialize the embedding model.
 * Uses Xenova/all-MiniLM-L6-v2 which produces 384-dimensional embeddings.
 * Model is ~23MB and will be cached after first download.
 */
export async function initEmbeddings(
  onProgress?: (progress: { status: string; loaded?: number; total?: number }) => void
): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const pipe = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          progress_callback: onProgress,
        }
      );
      extractor = pipe;
      return pipe;
    } catch (error) {
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Yield control back to the browser to prevent UI freezing
 */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

/**
 * Generate embeddings for an array of text chunks.
 * Returns normalized embeddings as number[][].
 * Uses small batches and yields control to prevent UI freezing.
 */
export async function generateEmbeddings(
  texts: string[],
  options?: {
    batchSize?: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<number[][]> {
  const model = await initEmbeddings();
  // Use smaller batch size to prevent UI freezing (8 instead of 32-64)
  const batchSize = Math.min(options?.batchSize ?? 8, 8);
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, Math.min(i + batchSize, texts.length));

    // Generate embeddings for batch
    const output = await model(batch, { pooling: 'mean', normalize: true });

    // Convert to number[][] format
    for (const embedding of output.tolist()) {
      results.push(embedding as number[]);
    }

    // Update progress
    if (options?.onProgress) {
      options.onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }

    // Yield control back to the browser every batch to keep UI responsive
    if (i + batchSize < texts.length) {
      await yieldToMain();
    }
  }

  return results;
}

/**
 * Check if the model is already loaded in memory.
 */
export function isModelLoaded(): boolean {
  return extractor !== null;
}

/**
 * Get current loading status.
 */
export function isModelLoading(): boolean {
  return loadingPromise !== null && extractor === null;
}
