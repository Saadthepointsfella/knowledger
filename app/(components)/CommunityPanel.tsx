// apps/web/app/(components)/CommunityPanel.tsx
"use client";

type Props = {
  nodes: Array<{ id: string; community?: number }>;
  onSelectCommunity: (communityId: number | null) => void;
  activeCommunity: number | null;
  labels?: Record<number, string>;
};

export default function CommunityPanel({ nodes, onSelectCommunity, activeCommunity, labels }: Props) {
  // Count sizes per community
  const sizes = new Map<number, number>();
  for (const n of nodes) {
    if (typeof n.community !== "number") continue;
    sizes.set(n.community, (sizes.get(n.community) || 0) + 1);
  }
  const list = Array.from(sizes.entries()).sort((a, b) => b[1] - a[1]); // desc by size

  return (
    <div className="space-y-2 p-3 rounded bg-neutral-900 border border-neutral-800">
      <div className="text-sm text-white mb-2">Communities</div>
      <button
        className={`w-full text-left px-2 py-1 rounded text-white ${activeCommunity === null ? "bg-neutral-800" : "bg-neutral-900 hover:bg-neutral-800"}`}
        onClick={() => onSelectCommunity(null)}
      >
        Show all
      </button>
      <div className="max-h-48 overflow-auto space-y-1">
        {list.map(([cid, size]) => (
          <button
            key={cid}
            className={`w-full text-left px-2 py-1 rounded text-white ${activeCommunity === cid ? "bg-neutral-800" : "bg-neutral-900 hover:bg-neutral-800"}`}
            onClick={() => onSelectCommunity(cid)}
            title={labels?.[cid] ? `${labels[cid]} (${size})` : `Community ${cid}`}
          >
            {(labels?.[cid] || `Community ${cid}`)} — {size} nodes
          </button>
        ))}
      </div>
    </div>
  );
}
