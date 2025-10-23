/* eslint-disable no-restricted-globals */
self.onmessage = (e: MessageEvent) => {
  const { base, vectors } = e.data as { base: number[]; vectors: number[] };
  // vectors is flattened (N * D)
  const D = base.length;
  const N = Math.floor(vectors.length / D);
  const out = new Float32Array(N);
  // precompute base norm
  let nb = 0;
  for (let i=0;i<D;i++) nb += (base[i]||0)*(base[i]||0);
  const nbS = Math.sqrt(nb) || 1;

  for (let n=0;n<N;n++) {
    let dot = 0, na = 0;
    const off = n*D;
    for (let i=0;i<D;i++) {
      const x = base[i] || 0;
      const y = vectors[off+i] || 0;
      dot += x*y;
      na += y*y;
    }
    const denom = nbS * (Math.sqrt(na) || 1);
    out[n] = denom ? dot/denom : 0;
  }
  (self as any).postMessage(out);
};
