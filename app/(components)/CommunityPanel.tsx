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
    <div className="space-y-1.5">
      <button
        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
          activeCommunity === null
            ? "bg-neutral-800 text-neutral-200"
            : "bg-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-300"
        }`}
        onClick={() => onSelectCommunity(null)}
      >
        Show all
      </button>
      <div className="max-h-48 overflow-auto space-y-1">
        {list.map(([cid, size]) => {
          const label = labels?.[cid] || `Community ${cid}`;
          return (
            <button
              key={cid}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                activeCommunity === cid
                  ? "bg-neutral-800 text-neutral-200"
                  : "bg-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-300"
              }`}
              onClick={() => onSelectCommunity(cid)}
              title={`${label} (${size} nodes)`}
            >
              <div className="truncate">{label}</div>
              <div className="text-[10px] text-neutral-500">{size} nodes</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
