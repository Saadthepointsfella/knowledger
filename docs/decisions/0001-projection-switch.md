# Decision 0001 — Projection Switch Rule
- Default client t-SNE (2D) in a Web Worker.
- Switch to server UMAP when N>400 or client projection time >250ms.
- Reason: spec v1.0 performance guardrails; reversible via env flag.
