// apps/web/models/edgeTypes.ts
export type EdgeType =
  | "causes"
  | "explains"
  | "depends_on"
  | "contradicts"
  | "leads_to"
  | "relates_to";

export const EDGE_TYPE_DISPLAY: Record<EdgeType, string> = {
  causes: "Causes",
  explains: "Explains",
  depends_on: "Depends On",
  contradicts: "Contradicts",
  leads_to: "Leads To",
  relates_to: "Relates To",
};

// Polarity → used in equilibrium sim (+1 supportive / -1 conflict / 0 neutral)
export const EDGE_TYPE_POLARITY: Record<EdgeType, number> = {
  causes: +1,
  explains: +1,
  leads_to: +1,
  depends_on: 0,
  relates_to: 0,
  contradicts: -1,
};

// Optional color hints for UI styling
export const EDGE_TYPE_COLOR: Record<EdgeType, string> = {
  causes: "#f87171",        // red-light
  explains: "#34d399",      // green-light
  depends_on: "#60a5fa",    // blue-light
  contradicts: "#facc15",   // yellow-light
  leads_to: "#a78bfa",      // purple-light
  relates_to: "#94a3b8",    // gray-light
};
