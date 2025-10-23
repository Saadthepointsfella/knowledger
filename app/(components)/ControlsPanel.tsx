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
    <div className="space-y-4 p-3 rounded bg-neutral-900 border border-neutral-800">
      <div>
        <div className="mb-1 text-sm text-white">Similarity threshold</div>
        <input
          type="range"
          min={0.6} max={0.9} step={0.01}
          value={threshold}
          onChange={e => {
            setThreshold(parseFloat(e.target.value));
            setHasChanges(true);
          }}
          className="w-full"
        />
        <div className="text-xs text-neutral-300">Current: {threshold.toFixed(2)}</div>
      </div>

      <div>
        <div className="mb-1 text-sm text-white">k (nearest neighbors)</div>
        <input
          type="range"
          min={3} max={10} step={1}
          value={k}
          onChange={e => {
            setK(parseInt(e.target.value));
            setHasChanges(true);
          }}
          className="w-full"
        />
        <div className="text-xs text-neutral-300">Current: {k}</div>
      </div>

      <button
        onClick={handleApply}
        disabled={!hasChanges}
        className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Apply Changes
      </button>
    </div>
  );
}
