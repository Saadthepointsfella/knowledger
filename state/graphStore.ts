import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Graph } from "@/lib/types";
import { cosine } from "@/lib/cosine";
import type { EdgeType } from "@/models/edgeTypes";

export type NodeType =
  | "Problem"
  | "Insight"
  | "Mechanism"
  | "Outcome"
  | "Actor"
  | "Resource"
  | "Note";

export type ViewMode = "Resonance" | "Structure" | "Hybrid";

export interface NodeData {
  id: string;
  type: NodeType;
  text: string;
  vec: number[];
  x?: number;
  y?: number;
  community?: number | null;
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  weight?: number;
  notes?: string;
}

interface Selection {
  nodes: Set<string>;
  edges: Set<string>;
}

/* 🧮 Simulation parameters (Phase 3 additive) */
export interface SimParams {
  epsilon: number;
  maxTicks: number;
  speedMs: number;
  damping: number;
  snapback: boolean;
}

export interface SimState {
  running: boolean;
  tick: number;
  avgTension: number;
  params: SimParams;
  preSimPositions?: Record<string, { x: number; y: number }>;
  oscillator: { on: boolean; sensitivity: number };
}

/* 🧱 Store */
interface GraphState {
  nodes: Record<string, NodeData>;
  edges: Record<string, EdgeData>;
  viewMode: ViewMode;
  selection: Selection;
  ghostTypes: Record<string, NodeType | null>;

  // Phase 2: highlight & editing
  highlightBaseId: string | null;
  setHighlightBase: (id: string | null) => void;
  clearHighlight: () => void;

  setNodeTextVec: (id: string, text: string, vec: number[]) => void;
  applyNodePatch: (id: string, patch: Partial<NodeData>) => void;
  recomputeAdjacentEdgeWeights: (id: string) => void;
  nudgeNodePosition: (id: string) => void;

  upsertFromPhase1: (g: Graph, texts: string[], embeddings: number[][]) => void;
  setNodeType: (id: string, t: NodeType) => void;
  selectNode: (id: string, append: boolean) => void;
  addEdge: (from: string, to: string, type: EdgeType) => void;
  setView: (m: ViewMode) => void;
  suggestNodeType: (id: string, t: NodeType | null) => void;
  clear: () => void;

  // Phase 3 additive — relational + simulation
  setEdgeType: (id: string, type: EdgeType) => void;
  setEdgeWeight: (id: string, weight: number) => void;
  setEdgeNotes: (id: string, notes: string) => void;

  sim: SimState;
  setSimParams: (p: Partial<SimParams> & { oscillator?: { on?: boolean; sensitivity?: number } }) => void;
  startSim: (params?: Partial<SimParams>) => void;
  stopSim: () => void;
  applySimTick: (positions: Record<string, { x: number; y: number }>, avgTension: number) => void;
  savePreSimPositions: () => void;
  snapback: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: {},
  edges: {},
  viewMode: "Resonance",
  selection: { nodes: new Set(), edges: new Set() },
  ghostTypes: {},

  // 🔦 Phase 2 highlight
  highlightBaseId: null,
  setHighlightBase: (id) => set({ highlightBaseId: id }),
  clearHighlight: () => set({ highlightBaseId: null }),

  upsertFromPhase1: (g, texts, embeddings) => {
    const byId: Record<string, NodeData> = {};
    g.nodes.forEach((n: any, i: number) => {
      const id = String(n.id ?? i);
      byId[id] = {
        id,
        type: "Note",
        text: texts?.[i] || n.text || "",
        vec: embeddings?.[i] || [],
        x: n.x,
        y: n.y,
        community: typeof n.community === "number" ? n.community : null,
      };
      (n as any).__nid = id;
    });
    set({ nodes: byId, edges: {} });
  },

  setNodeType: (id, t) =>
    set((s) => ({
      nodes: { ...s.nodes, [id]: { ...s.nodes[id], type: t } },
    })),

  // ✏️ Phase 2 editing: text+vec update
  setNodeTextVec: (id, text, vec) =>
    set((s) => ({
      nodes: {
        ...s.nodes,
        [id]: { ...s.nodes[id], text, vec },
      },
    })),

  applyNodePatch: (id, patch) =>
    set((s) => ({
      nodes: { ...s.nodes, [id]: { ...s.nodes[id], ...patch } },
    })),

  // 🔁 Recompute only edges touching node `id`
  recomputeAdjacentEdgeWeights: (id) =>
    set((s) => {
      const newEdges = { ...s.edges };
      const a = s.nodes[id]?.vec || [];
      for (const [eid, e] of Object.entries(newEdges)) {
        if (e.from === id || e.to === id) {
          const otherId = e.from === id ? e.to : e.from;
          const b = s.nodes[otherId]?.vec || [];
          newEdges[eid] = { ...e, weight: a.length && b.length ? cosine(a, b) : e.weight };
        }
      }
      return { edges: newEdges };
    }),

  // 🌀 Gentle position nudge toward neighbor average
  nudgeNodePosition: (id) =>
    set((s) => {
      const me = s.nodes[id];
      if (!me) return {};
      let sx = 0, sy = 0, c = 0;
      for (const e of Object.values(s.edges)) {
        if (e.from === id || e.to === id) {
          const oid = e.from === id ? e.to : e.from;
          const on = s.nodes[oid];
          if (on?.x != null && on?.y != null) {
            sx += on.x!;
            sy += on.y!;
            c++;
          }
        }
      }
      if (!c || me.x == null || me.y == null) return {};
      const avgx = sx / c, avgy = sy / c;
      const nx = me.x + (avgx - me.x) * 0.2;
      const ny = me.y + (avgy - me.y) * 0.2;
      return { nodes: { ...s.nodes, [id]: { ...me, x: nx, y: ny } } };
    }),

  selectNode: (id, append) =>
    set((s) => {
      const nodes = new Set(s.selection.nodes);
      if (!id) {
        nodes.clear();
        return { selection: { ...s.selection, nodes } };
      }
      if (append) {
        nodes.has(id) ? nodes.delete(id) : nodes.add(id);
      } else {
        nodes.clear();
        nodes.add(id);
      }
      return { selection: { ...s.selection, nodes } };
    }),

  addEdge: (from, to, type) => {
    const id = nanoid(6);
    set((s) => {
      const a = s.nodes[from]?.vec || [];
      const b = s.nodes[to]?.vec || [];
      const weight = a.length && b.length ? cosine(a, b) : 0.5;
      return { edges: { ...s.edges, [id]: { id, from, to, type, weight, notes: "" } } };
    });
  },

  setView: (m) => set({ viewMode: m }),
  suggestNodeType: (id, t) =>
    set((s) => ({ ghostTypes: { ...s.ghostTypes, [id]: t } })),
  clear: () =>
    set({
      nodes: {},
      edges: {},
      selection: { nodes: new Set(), edges: new Set() },
      highlightBaseId: null,
    }),

  // ——— Phase 3: relational edge mutations ———
  setEdgeType: (id, type) =>
    set((s) => ({ edges: { ...s.edges, [id]: { ...s.edges[id], type } } })),

  setEdgeWeight: (id, weight) =>
    set((s) => ({ edges: { ...s.edges, [id]: { ...s.edges[id], weight } } })),

  setEdgeNotes: (id, notes) =>
    set((s) => ({ edges: { ...s.edges, [id]: { ...s.edges[id], notes } } })),

  // ——— Phase 3: sim state ———
  sim: {
    running: false,
    tick: 0,
    avgTension: 0,
    params: { epsilon: 0.002, maxTicks: 200, speedMs: 16, damping: 0.9, snapback: false },
    preSimPositions: {},
    oscillator: { on: false, sensitivity: 1.0 },
  },

  setSimParams: (p) =>
    set((s) => ({
      sim: {
        ...s.sim,
        params: { ...s.sim.params, ...p },
        oscillator: {
          on: p?.oscillator?.on ?? s.sim.oscillator.on,
          sensitivity: p?.oscillator?.sensitivity ?? s.sim.oscillator.sensitivity,
        },
      },
    })),

  startSim: (params) =>
    set((s) => ({
      sim: {
        ...s.sim,
        running: true,
        tick: 0,
        avgTension: 0,
        params: { ...s.sim.params, ...params },
      },
    })),

  stopSim: () =>
    set((s) => ({
      sim: { ...s.sim, running: false },
    })),

  applySimTick: (positions, avgTension) =>
    set((s) => {
      const newNodes = { ...s.nodes };
      for (const [id, p] of Object.entries(positions))
        if (newNodes[id]) newNodes[id] = { ...newNodes[id], x: p.x, y: p.y };
      return {
        nodes: newNodes,
        sim: { ...s.sim, tick: s.sim.tick + 1, avgTension },
      };
    }),

  savePreSimPositions: () =>
    set((s) => {
      const map: Record<string, { x: number; y: number }> = {};
      for (const [id, n] of Object.entries(s.nodes))
        if (n.x != null && n.y != null) map[id] = { x: n.x!, y: n.y! };
      return { sim: { ...s.sim, preSimPositions: map } };
    }),

  snapback: () =>
    set((s) => {
      const pre = s.sim.preSimPositions;
      if (!pre) return {};
      const nodes = { ...s.nodes };
      for (const [id, p] of Object.entries(pre))
        if (nodes[id]) nodes[id] = { ...nodes[id], x: p.x, y: p.y };
      return { nodes, sim: { ...s.sim, running: false } };
    }),
}));
