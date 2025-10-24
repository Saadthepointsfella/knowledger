# Knowledge Resonator — MVP Technical Specification (v1.0, 2025-10-18)

This document serves as a placeholder for the full technical specification.

The MVP implements the complete resonance loop:
**Input → Chunk → Embed → Analyze (kNN graph) → Project (t‑SNE client) → Visualize (force graph) → Metrics**

Key features:
- Next.js App Router + TypeScript + Tailwind
- OpenAI embeddings with Upstash Redis caching
- Client-side t-SNE projection (Web Worker)
- kNN graph construction with configurable thresholds
- Force-directed graph visualization
- Optional Python UMAP service for larger datasets

For full specification details, refer to the original specification document.
