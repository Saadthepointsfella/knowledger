"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Graph as Phase1Graph } from "@/lib/types";
import { useGraphStore, NodeType } from "@/state/graphStore";
import { suggestNodeType } from "@/lib/heuristics";
import { cosine } from "@/lib/cosine";
import EditableNode from "./EditableNode";
import EdgeInspector from "./EdgeInspector";
import CausalEditor from "./CausalEditor";
import { EDGE_TYPE_COLOR, EDGE_TYPE_DISPLAY } from "@/models/edgeTypes";
import { simTick } from "@/lib/sim/equilibrium";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/** Starburst glyph */
function drawStarBurst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: NodeType,
  color: string,
  isSelected: boolean,
  intensity: number,
  scale = 1.0
) {
  const rays =
    type === "Problem" ? 8 :
    type === "Insight" ? 6 :
    type === "Mechanism" ? 12 :
    type === "Outcome" ? 10 :
    type === "Actor" ? 7 :
    type === "Resource" ? 9 : 5;

  const innerRadius = size * 0.4 * scale;
  const outerRadius = size * scale;

  const mix = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const rr = Math.round(r + (255 - r) * a);
    const gg = Math.round(g + (255 - g) * a);
    const bb = Math.round(b + (255 - b) * a);
    return `rgb(${rr},${gg},${bb})`;
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < rays; i++) {
    const a0 = (Math.PI * 2 * i) / rays;
    const a1 = (Math.PI * 2 * (i + 1)) / rays;
    const am = (a0 + a1) / 2;
    if (i === 0) ctx.moveTo(Math.cos(a0) * innerRadius, Math.sin(a0) * innerRadius);
    ctx.lineTo(Math.cos(am) * outerRadius, Math.sin(am) * outerRadius);
    ctx.lineTo(Math.cos(a1) * innerRadius, Math.sin(a1) * innerRadius);
  }
  ctx.closePath();

  ctx.fillStyle = mix(color, intensity * 0.6);
  ctx.fill();
  ctx.strokeStyle = isSelected ? "#F5F5DC" : mix(color, intensity * 0.2);
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.stroke();

  if (intensity > 0.6) {
    ctx.shadowBlur = 10 * (intensity - 0.6);
    ctx.shadowColor = "#ffffff";
  }
  ctx.restore();
}

const typeColor = (t: NodeType) =>
  ({
    Problem: "#ef4444",
    Insight: "#22c55e",
    Mechanism: "#06b6d4",
    Outcome: "#f59e0b",
    Actor: "#a78bfa",
    Resource: "#60a5fa",
    Note: "#94a3b8",
  }[t] || "#94a3b8");

export default function ForceGraphWrapper({
  proximityGraph,
  labels,
}: {
  proximityGraph: Phase1Graph;
  labels?: Record<number, string>;
}) {
  const fgRef = useRef<any>(null);
  const lastClickRef = useRef<{ id: string; t: number; shift: boolean } | null>(null);

  const [classMenu, setClassMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [editor, setEditor] = useState<{ id: string; x: number; y: number } | null>(null);
  const [causalEditor, setCausalEditor] = useState<{ id: string; x: number; y: number } | null>(null);
  const [edgeInspectorId, setEdgeInspectorId] = useState<string | null>(null);

  const {
    nodes,
    edges,
    selection,
    selectNode,
    setNodeType,
    suggestNodeType: setGhost,
    highlightBaseId,
    setHighlightBase,
    clearHighlight,
    sim,
    startSim,
    stopSim,
    applySimTick,
    savePreSimPositions,
  } = useGraphStore((s) => ({
    nodes: s.nodes,
    edges: s.edges,
    selection: s.selection,
    selectNode: s.selectNode,
    setNodeType: s.setNodeType,
    suggestNodeType: s.suggestNodeType,
    highlightBaseId: s.highlightBaseId,
    setHighlightBase: s.setHighlightBase,
    clearHighlight: s.clearHighlight,
    sim: s.sim,
    startSim: s.startSim,
    stopSim: s.stopSim,
    applySimTick: s.applySimTick,
    savePreSimPositions: s.savePreSimPositions,
  }));

  /** Relevance (global & community) */
  const relevanceScores = useMemo(() => {
    function centroid(vectors: number[][]): number[] {
      if (!vectors.length) return [];
      const d = vectors[0]?.length || 0;
      const c = new Array(d).fill(0);
      for (const v of vectors) for (let i=0;i<d;i++) c[i] += v[i] || 0;
      for (let i=0;i<d;i++) c[i] /= vectors.length;
      return c;
    }
    const ids = proximityGraph.nodes.map((n: any) => String(n.__nid ?? n.id));
    const vecs = ids.map((id) => nodes[id]?.vec || []).filter((v) => v.length);
    if (!vecs.length) return {};
    const gCent = centroid(vecs);

    const byCom: Record<number, number[][]> = {};
    proximityGraph.nodes.forEach((n: any) => {
      const id = String(n.__nid ?? n.id);
      const com = typeof n.community === "number" ? n.community : -1;
      if (!byCom[com]) byCom[com] = [];
      const v = nodes[id]?.vec || [];
      if (v.length) byCom[com].push(v);
    });
    const cCent: Record<number, number[]> = {};
    for (const [k, arr] of Object.entries(byCom)) cCent[+k] = centroid(arr as number[][]);

    const out: Record<string, { global: number; community: number }> = {};
    proximityGraph.nodes.forEach((n: any) => {
      const id = String(n.__nid ?? n.id);
      const com = typeof n.community === "number" ? n.community : -1;
      const v = nodes[id]?.vec || [];
      const gs = v.length && gCent.length ? cosine(v, gCent) : 0;
      const cs = v.length && cCent[com]?.length ? cosine(v, cCent[com]) : 0;
      out[id] = { global: (gs + 1) / 2, community: (cs + 1) / 2 };
    });
    return out;
  }, [nodes, proximityGraph]);

  /** Highlight map from selected base node */
  const highlightMap = useMemo(() => {
    if (!highlightBaseId) return null;
    const base = nodes[highlightBaseId];
    if (!base?.vec?.length) return null;
    const map: Record<string, number> = {};
    for (const [id, n] of Object.entries(nodes)) {
      const simv = n.vec?.length ? cosine(base.vec, n.vec) : 0;
      const s01 = (simv + 1) / 2;
      map[id] = Math.max(0, Math.min(1, (s01 - 0.4) / 0.4));
    }
    return map;
  }, [highlightBaseId, nodes]);

  /** Merge proximity edges + typed edges for rendering */
  const renderGraph = useMemo(() => {
    const SCALE = 0.5;
    const graphNodes = proximityGraph.nodes.map((n: any, i: number) => {
      const id = n.__nid || String(n.id ?? i);
      const node = nodes[id];
      return {
        id,
        text: n.text || node?.text || "",
        x: (n.x || 0) * SCALE,
        y: (n.y || 0) * SCALE,
        community: n.community,
        type: node?.type || "Note",
        relevance: relevanceScores[id],
      };
    });

    const simLinks = proximityGraph.edges.map((e: any) => ({
      id: `sim_${String(e.source)}_${String(e.target)}`,
      source: String(e.source),
      target: String(e.target),
      weight: e.weight ?? 0.3,
      directed: false,
      _kind: "sim",
    }));

    const typedLinks = Object.values(edges).map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      weight: e.weight ?? 0.5,
      directed: true,
      type: e.type,
      _kind: "typed",
    }));

    return { nodes: graphNodes, links: [...simLinks, ...typedLinks] };
  }, [nodes, edges, proximityGraph, relevanceScores]);

  /** Fit camera initially */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !proximityGraph.nodes.length) return;
    setTimeout(() => fg.zoomToFit?.(400, 10), 400);
  }, [proximityGraph]);

  /** Keyboard helpers */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?") setShowHelp((h) => !h);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        clearHighlight();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearHighlight]);

  /** Simulation loop */
  useEffect(() => {
    if (!sim.running) return;
    savePreSimPositions();
    const interval = setInterval(() => {
      const nodesForSim: Record<string, { x: number; y: number; vec: number[] }> = {};
      for (const [id, n] of Object.entries(nodes))
        if (n.x != null && n.y != null) nodesForSim[id] = { x: n.x!, y: n.y!, vec: n.vec || [] };

      const edgesForSim = Object.values(edges).map((e) => ({
        id: e.id, from: e.from, to: e.to, type: e.type, weight: e.weight ?? 0.5,
      }));

      const res = simTick(nodesForSim, edgesForSim, {
        epsilon: sim.params.epsilon,
        maxTicks: sim.params.maxTicks,
        step: 1.0,
        damping: sim.params.damping,
        bounds: { x: 400, y: 300 },
      });

      applySimTick(res.positions, res.avgTension);
      const nowTick = useGraphStore.getState().sim.tick;
      if (nowTick >= sim.params.maxTicks || res.avgTension < sim.params.epsilon)
        useGraphStore.getState().stopSim();
    }, Math.max(8, sim.params.speedMs));
    return () => clearInterval(interval);
  }, [sim.running, sim.params, nodes, edges, applySimTick, savePreSimPositions]);

  /** Pulse scale from oscillator state (quick heuristic) */
  const pulseScaleFor = (id: string) => {
    if (!sim.oscillator.on) return 1.0;
    const inc = Object.values(edges).filter((e) => e.from === id || e.to === id);
    const avgW = inc.length ? inc.reduce((a, b) => a + (b.weight ?? 0.5), 0) / inc.length : 0.5;
    const instability = Math.max(0, 1 - avgW);
    const hz = 0.5 + Math.min(1.5, instability * sim.oscillator.sensitivity * 2);
    const t = performance.now() / 1000;
    return 1 + 0.15 * Math.sin(2 * Math.PI * hz * t);
  };

  const typeOptions: NodeType[] = ["Problem","Insight","Mechanism","Outcome","Actor","Resource","Note"];

  return (
    <div className="relative w-full h-full">
      <ForceGraph2D
        ref={fgRef}
        graphData={renderGraph as any}
        nodeRelSize={10}
        minZoom={0.5}
        maxZoom={8}
        nodeLabel={(n: any) => {
          const text = nodes[n.id]?.text || n.text || "";
          const truncated = text.length > 100 ? text.slice(0, 100) + "…" : text;
          const r = n.relevance;
          const rG = r ? (r.global * 100).toFixed(0) : "–";
          const rC = r ? (r.community * 100).toFixed(0) : "–";
          if (highlightBaseId && nodes[highlightBaseId]?.vec && nodes[n.id]?.vec) {
            const simv = cosine(nodes[highlightBaseId].vec, nodes[n.id].vec);
            const s01 = ((simv + 1) / 2).toFixed(2);
            return `${truncated}\n\nGlobal: ${rG}%  Community: ${rC}%\nSim(selected): ${s01}`;
          }
          return `${truncated}\n\nGlobal: ${rG}%  Community: ${rC}%`;
        }}
        onNodeClick={(node: any, event: MouseEvent) => {
          const id = String(node.id);
          const now = Date.now();
          const last = lastClickRef.current;

          // Double-click detection
          if (last && last.id === id && now - last.t < 300) {
            if (last.shift) {
              // Shift+Double-click → text editor
              setEditor({ id, x: event.clientX, y: event.clientY });
            } else {
              // Double-click → causal editor
              setCausalEditor({ id, x: event.clientX, y: event.clientY });
            }
            lastClickRef.current = null;
            return;
          }

          lastClickRef.current = { id, t: now, shift: event.shiftKey };
          useGraphStore.getState().selectNode(id, event.shiftKey || event.metaKey);
          if (!event.shiftKey && !event.metaKey) useGraphStore.getState().setHighlightBase(id);
        }}
        onNodeRightClick={(node: any, event: MouseEvent) => {
          event.preventDefault();
          const id = String(node.id);
          selectNode(id, false);
          setClassMenu({ nodeId: id, x: event.clientX, y: event.clientY });
          const s = suggestNodeType(String(nodes[id]?.text || node.text || ""));
          useGraphStore.getState().suggestNodeType(id, s.type);
        }}
        onBackgroundClick={() => {
          selectNode("", false);
          setClassMenu(null);
        }}
        onLinkClick={(l: any) => {
          if (l._kind === "typed") setEdgeInspectorId(String(l.id));
        }}
        linkColor={(l: any) => (l._kind === "typed" ? (EDGE_TYPE_COLOR[l.type] ?? "#88c") : "rgba(255,255,255,0.25)")}
        linkWidth={(l: any) => (l._kind === "typed" ? 0.5 + 3 * (l.weight ?? 0.5) : 0.6)}
        linkDirectionalArrowLength={(l: any) => (l._kind === "typed" ? 6 : 0)}
        linkDirectionalArrowRelPos={0.96}
        linkLabel={(l: any) => (l._kind === "typed" ? `${EDGE_TYPE_DISPLAY[l.type]} (${(l.weight ?? 0.5).toFixed(2)})` : "")}
        nodeCanvasObjectMode={() => "replace"}
        nodeCanvasObject={(n: any, ctx: any) => {
          const id = String(n.id);
          const current = nodes[id];
          const nodeType = current?.type || "Note";
          const baseColor = typeColor(nodeType);
          const isSelected = selection.nodes.has(id);
          const intensity = highlightMap ? (highlightMap[id] ?? 0) : 0;
          const scale = pulseScaleFor(id);
          drawStarBurst(ctx, n.x, n.y, 8, nodeType, baseColor, isSelected, intensity, scale);
        }}
      />

      {/* Causal Editor (double-click) */}
      {causalEditor && (
        <div className="fixed z-50" style={{ left: causalEditor.x, top: causalEditor.y }}>
          <CausalEditor sourceId={causalEditor.id} onClose={() => setCausalEditor(null)} />
        </div>
      )}

      {/* Edge Inspector (click typed edge) */}
      {edgeInspectorId && <EdgeInspector edgeId={edgeInspectorId} onClose={() => setEdgeInspectorId(null)} />}

      {/* Inline Text Editor (Shift + Double-click) */}
      {editor && (
        <div className="fixed z-50" style={{ left: editor.x, top: editor.y }}>
          <EditableNode
            nodeId={editor.id}
            initialText={nodes[editor.id]?.text || ""}
            onClose={() => setEditor(null)}
            onUpdated={() => setEditor(null)}
          />
        </div>
      )}

      {/* Node type context menu */}
      {classMenu && (
        <div
          className="fixed bg-neutral-900 border-2 border-neutral-700 rounded-lg p-2 z-50 shadow-xl"
          style={{ left: classMenu.x, top: classMenu.y }}
        >
          <div className="text-xs text-neutral-400 mb-2 px-2">Classify as:</div>
          {(["Problem","Insight","Mechanism","Outcome","Actor","Resource","Note"] as NodeType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setNodeType(classMenu.nodeId, type);
                setClassMenu(null);
              }}
              className="block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-neutral-800 transition-colors"
              style={{ color: typeColor(type) }}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Help */}
      {showHelp && (
        <div className="absolute top-4 left-4 bg-neutral-900/95 border-2 border-neutral-700 rounded-lg p-4 text-sm font-mono text-neutral-300 z-40">
          <div className="font-bold text-[#F5F5DC] mb-2">Shortcuts</div>
          <div>Double-click node → Causal Editor</div>
          <div>Shift+Double-click node → Edit text</div>
          <div>Click typed edge → Edge Inspector</div>
          <div>Cmd/Ctrl+K → Reset Highlight</div>
          <div>? → Toggle Help</div>
        </div>
      )}
    </div>
  );
}
