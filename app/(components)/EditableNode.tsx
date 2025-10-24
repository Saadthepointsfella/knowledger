"use client";

import { useEffect, useRef, useState } from "react";
import { useGraphStore } from "@/state/graphStore";

type Props = {
  nodeId: string;
  initialText: string;
  onClose?: () => void;
  onUpdated?: () => void;
};

export default function EditableNode({ nodeId, initialText, onClose, onUpdated }: Props) {
  const { setNodeTextVec, nudgeNodePosition, recomputeAdjacentEdgeWeights } = useGraphStore((s) => ({
    setNodeTextVec: s.setNodeTextVec,
    nudgeNodePosition: s.nudgeNodePosition,
    recomputeAdjacentEdgeWeights: s.recomputeAdjacentEdgeWeights,
  }));

  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/embedSingle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Embed failed (${res.status})`);
      }
      const { embedding } = await res.json();
      setNodeTextVec(nodeId, text, embedding);
      recomputeAdjacentEdgeWeights(nodeId);
      nudgeNodePosition(nodeId);
      onUpdated?.();
      onClose?.();
    } catch (e) {
      console.error(e);
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  }

  return (
    <div className="absolute z-50 w-[420px] rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-2xl">
      <div className="text-xs text-neutral-400 mb-2">Edit node • ⌘/Ctrl+Enter to save · Esc to cancel</div>
      <textarea
        ref={inputRef}
        className="w-full h-32 rounded bg-neutral-800 text-neutral-50 p-2 outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="mt-2 flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1 text-sm rounded border border-neutral-700 hover:bg-neutral-800">
          Cancel
        </button>
        <button
          disabled={saving}
          onClick={save}
          className="px-3 py-1 text-sm rounded bg-neutral-100 text-neutral-900 hover:bg-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
