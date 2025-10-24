import { Chunk } from "./types";

export function naiveSentenceSplit(text: string): Chunk[] {
  const parts = text.split(/(?<=[.!?])\s+/);
  let idx = 0; const chunks: Chunk[] = [];
  for (let i = 0; i < parts.length; i++) {
    const t = parts[i];
    const start = text.indexOf(t, idx);
    const end = start + t.length;
    chunks.push({ id: String(i), start, end, text: t });
    idx = end;
  }
  return chunks;
}
