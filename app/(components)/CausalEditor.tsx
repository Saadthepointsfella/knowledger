"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { cosine } from "@/lib/cosine";
import { useGraphStore } from "@/state/graphStore";
import type { EdgeType } from "@/models/edgeTypes";
import { EDGE_TYPE_COLOR, EDGE_TYPE_DISPLAY } from "@/models/edgeTypes";

export default function CausalEditor({
  sourceId,
  onClose,
}: {
  sourceId: string;
  onClose: () => void;
}) {
  const {
    nodes,
    edges,
    addEdge,
    setEdgeType,
    setEdgeWeight,
  } = useGraphStore((s) => ({
    nodes: s.nodes,
    edges: s.edges,
    addEdge: s.addEdge,
    setEdgeType: s.setEdgeType,
    setEdgeWeight: s.setEdgeWeight,
  }));

  const src = nodes[sourceId];
  const [query, setQuery] = useState("");
  const [edgeType, setType] = useState<EdgeType>("leads_to");
  const [weight, setWeight] = useState<number>(0.8);

  // Close on ESC
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const candidates = useMemo(() => {
    if (!src?.vec?.length) return [];
    const list = Object.values(nodes)
      .filter((n) => n.id !== sourceId && n.vec?.length)
      .map((n) => {
        const sim = cosine(src.vec, n.vec);
        return { id: n.id, text: n.text, type: n.type, sim, s01: (sim + 1) / 2 };
      })
      .sort((a, b) => b.sim - a.sim);

    const filtered = query
      ? list.filter((c) => c.text?.toLowerCase().includes(query.toLowerCase()))
      : list;

    return filtered.slice(0, 16);
  }, [nodes, sourceId, src?.vec, query]);

  function ensureEdge(toId: string) {
    // Check if edge exists (sourceId -> toId)
    let existingId: string | null = null;
    for (const e of Object.values(edges)) {
      if (e.from === sourceId && e.to === toId) {
        existingId = e.id;
        break;
      }
    }
    if (!existingId) {
      addEdge(sourceId, toId, edgeType);
      // weight is initially cosine; set explicit weight override
      // Find edge again (by newest id is tricky); instead scan again for (sourceId,toId)
      const created = Object.values(useGraphStore.getState().edges).find(
        (e) => e.from === sourceId && e.to === toId
      );
      if (created) {
        setEdgeType(created.id, edgeType);
        setEdgeWeight(created.id, weight);
      }
    } else {
      setEdgeType(existingId, edgeType);
      setEdgeWeight(existingId, weight);
    }
  }

  if (!src) return null;

  return (
    <div
      ref={rootRef}
      className="rounded-xl border-2 border-neutral-700 bg-neutral-900 text-neutral-200 shadow-2xl w-[520px] p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-[#F5F5DC]">Causal Editor</div>
        <button
          onClick={onClose}
          className="px-2 py-0.5 rounded border border-neutral-700 hover:bg-neutral-800"
        >
          ✕
        </button>
      </div>

      <div className="text-xs text-neutral-400 mb-2">Source</div>
      <div className="p-2 rounded border border-neutral-800 bg-neutral-950 mb-3">
        <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">#{src.id}</div>
        <div className="text-sm leading-snug">{src.text}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Relation type */}
        <div className="col-span-1">
          <div className="text-xs text-neutral-400 mb-1">Relation</div>
          <div className="grid grid-cols-2 gap-1">
            {(["causes","explains","depends_on","contradicts","leads_to","relates_to"] as EdgeType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-2 py-1 rounded border text-xs ${edgeType===t ? "border-white" : "border-neutral-700 hover:bg-neutral-800"}`}
                style={{ color: EDGE_TYPE_COLOR[t] }}
                title={EDGE_TYPE_DISPLAY[t]}
              >
                {EDGE_TYPE_DISPLAY[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Weight slider */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-neutral-400">Weight</div>
            <div className="text-xs tabular-nums">{weight.toFixed(2)}</div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-[11px] text-neutral-500 mt-1">
            Heavier = stronger causal assertion (also renders thicker & more opaque).
          </div>
        </div>
      </div>

      {/* Target search */}
      <div className="mb-2">
        <div className="text-xs text-neutral-400 mb-1">Target (pick one)</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by text…"
          className="w-full px-2 py-1 rounded border border-neutral-700 bg-neutral-950 outline-none focus:border-neutral-500"
        />
      </div>

      {/* Candidates */}
      <div className="max-h-64 overflow-auto rounded border border-neutral-800">
        {candidates.length === 0 ? (
          <div className="p-3 text-sm text-neutral-400">No candidates match.</div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {candidates.map((c) => (
              <li key={c.id} className="p-2 hover:bg-neutral-800/60">
                <div className="flex items-start gap-2">
                  <div className="mt-1 text-[10px] text-neutral-500 w-14 shrink-0">
                    sim {(c.s01*100).toFixed(0)}%
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">#{c.id}</div>
                    <div className="text-sm leading-snug line-clamp-3">{c.text}</div>
                  </div>
                  <button
                    onClick={() => ensureEdge(c.id)}
                    className="ml-2 px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800 text-xs"
                    style={{ color: EDGE_TYPE_COLOR[edgeType] }}
                    title={`Create "${EDGE_TYPE_DISPLAY[edgeType]}" edge`}
                  >
                    Link
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-[11px] text-neutral-500">
          Tip: **Double-click** a node to open this editor. **Shift+Double-click** to edit its text.
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-800 text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
}
