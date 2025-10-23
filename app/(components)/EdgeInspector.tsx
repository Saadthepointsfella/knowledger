"use client";

import { useMemo, useState } from "react";
import { EDGE_TYPE_COLOR, EDGE_TYPE_DISPLAY, EdgeType } from "@/models/edgeTypes";
import { useGraphStore } from "@/state/graphStore";

type Props = { edgeId: string; onClose: () => void };

export default function EdgeInspector({ edgeId, onClose }: Props) {
  const { edges, setEdgeType, setEdgeWeight, setEdgeNotes } = useGraphStore((s) => ({
    edges: s.edges,
    setEdgeType: s.setEdgeType,
    setEdgeWeight: s.setEdgeWeight,
    setEdgeNotes: s.setEdgeNotes,
  }));
  const edge = edges[edgeId];
  const types = useMemo(() => Object.keys(EDGE_TYPE_DISPLAY) as EdgeType[], []);
  const [type, setType] = useState<EdgeType>((edge?.type as EdgeType) || "relates_to");
  const [w, setW] = useState<number>(typeof edge?.weight === "number" ? (edge?.weight as number) : 0.5);
  const [notes, setNotes] = useState<string>((edge as any)?.notes || "");

  if (!edge) return null;

  return (
    <div className="fixed right-4 top-4 z-50 w-[340px] rounded border border-neutral-700 bg-neutral-900 p-3 shadow-xl text-neutral-200">
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold">Edge Inspector</div>
        <button className="text-neutral-400 hover:text-neutral-200" onClick={onClose}>✕</button>
      </div>
      <div className="text-xs text-neutral-400 mb-2">{edge.from} → {edge.to}</div>

      <label className="block text-sm mb-1">Type</label>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-2 py-1 rounded border ${t === type ? "bg-neutral-800 border-neutral-600" : "border-neutral-700 hover:bg-neutral-800"}`}
            style={{ color: EDGE_TYPE_COLOR[t] }}
            title={EDGE_TYPE_DISPLAY[t]}
          >
            {EDGE_TYPE_DISPLAY[t]}
          </button>
        ))}
      </div>

      <label className="block text-sm mb-1">Weight ({w.toFixed(2)})</label>
      <input type="range" min={0} max={1} step={0.01} value={w} onChange={(e) => setW(parseFloat(e.target.value))} className="w-full" />

      <label className="block text-sm mt-3 mb-1">Notes</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-20 rounded bg-neutral-800 text-neutral-50 p-2" />

      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={() => {
            setEdgeType(edgeId, type);
            setEdgeWeight(edgeId, w);
            setEdgeNotes(edgeId, notes);
            console.log("event.edge.updated", { id: edgeId, type, weight: w });
            onClose();
          }}
          className="px-3 py-1 rounded bg-neutral-100 text-neutral-900"
        >
          Apply
        </button>
        <button onClick={onClose} className="px-3 py-1 rounded border border-neutral-700">Close</button>
      </div>
    </div>
  );
}
