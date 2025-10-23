// apps/web/app/(components)/ControlsPanel.tsx
"use client";

import { useState } from "react";

type Props = {
  defaultThreshold: number; // 0.6..0.9
  defaultK: number;         // 3..10
  onChange: (p: { threshold: number; k: number }) => void;
};

export default function ControlsPanel({ defaultThreshold, defaultK, onChange }: Props) {
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [k, setK] = useState(defaultK);
  const [hasChanges, setHasChanges] = useState(false);

  const handleApply = () => {
    onChange({ threshold, k });
    setHasChanges(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between mb-1 text-xs text-neutral-400">
          <span>Similarity threshold</span>
          <span className="text-neutral-300">{threshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.6} max={0.9} step={0.01}
          value={threshold}
          onChange={e => {
            setThreshold(parseFloat(e.target.value));
            setHasChanges(true);
          }}
          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-600"
        />
      </div>

      <div>
        <div className="flex justify-between mb-1 text-xs text-neutral-400">
          <span>k (nearest neighbors)</span>
          <span className="text-neutral-300">{k}</span>
        </div>
        <input
          type="range"
          min={3} max={10} step={1}
          value={k}
          onChange={e => {
            setK(parseInt(e.target.value));
            setHasChanges(true);
          }}
          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-600"
        />
      </div>

      {hasChanges && (
        <button
          onClick={handleApply}
          className="w-full px-3 py-1.5 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
        >
          Apply Changes
        </button>
      )}
    </div>
  );
}
