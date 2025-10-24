export type Chunk = { id: string; start: number; end: number; text: string };
export type Node = { id: string; text: string; x?: number; y?: number; z?: number; community?: number };
export type Edge = { source: string; target: string; weight: number };
export type Graph = { nodes: Node[]; edges: Edge[] };
export type Metrics = {
  avgSim: number;
  RC: number;
  clusters: number;
  nodeCount: number;
  edgeCount: number;
  elapsed: Record<string, number>;
};
