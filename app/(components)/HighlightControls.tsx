"use client";

import { useMemo } from "react";
import { useGraphStore } from "@/state/graphStore";
import { batchCosine } from "@/lib/similarity";

/**
 * Controls:
 *  - Click a node to set highlightBaseId (we'll wire from ForceGraphWrapper)
 *  - Scale chooser (linear or sigmoid)
 *  - Reset button
 * Store should expose: highlightBaseId, setHighlightBase, highlightMap
 */
export default function HighlightControls() {
  const { nodes, highlightBaseId, setHighlightBase, clearHighlight } = useGraphStore((s) => ({
    nodes: s.nodes,
    highlightBaseId: s.highlightBaseId,
    setHighlightBase: s.setHighlightBase,
    clearHighlight: s.clearHighlight,
  }));

  const info = useMemo(() => {
    if (!highlightBaseId) return null;
    const base = nodes[highlightBaseId];
    if (!base?.vec?.length) return null;
    return { id: highlightBaseId, len: Object.keys(nodes).length };
  }, [highlightBaseId, nodes]);

  return (
    <div className="flex items-center gap-2 text-xs">
      {info ? (
        <>
          <div className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700">
            Highlighting: <b>{info.id}</b>
          </div>
          <button onClick={clearHighlight} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">
            Reset Highlight
          </button>
        </>
      ) : (
        <div className="text-neutral-400">Click any node to “ping” semantic similarity.</div>
      )}
    </div>
  );
}
