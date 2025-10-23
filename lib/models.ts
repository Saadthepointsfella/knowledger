// Phase 2 domain models (structural layer)

export type NodeType = "Problem"|"Insight"|"Mechanism"|"Outcome"|"Actor"|"Resource"|"Note";

export type EdgeType =
  | "solves"
  | "causes"
  | "depends_on"
  | "leads_to"
  | "contradicts"
  | "relates_to";

export interface GraphNode {
  id: string;           // n_XXXXXXXXXXXX
  title: string;        // short label (first sentence fragment)
  body?: string;        // full text
  type: NodeType;
  vec: number[];        // embedding vector
  createdAt: number;
  updatedAt: number;
  // visualization
  x?: number; y?: number; z?: number;
  community?: number;
}

export interface GraphEdge {
  id: string;           // e_XXXXXXXXXXXX
  from: string;         // node id
  to: string;           // node id
  type: EdgeType;
  weight: number;       // 0..1
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IdeaSchema {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    problems: string[];
    mechanisms: string[];
    outcomes: string[];
    openQuestions: string[];
    assumptions: string[];
  };
  metrics: { selectionSize:number; typedCoverage:number; edgeDensity:number; };
  version: "2.0.0";
}

export type ViewMode = "Resonance" | "Structure" | "Hybrid";
