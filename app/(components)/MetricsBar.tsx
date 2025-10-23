// apps/web/app/(components)/MetricsBar.tsx
"use client";

type Props = {
  nodeCount: number;
  edgeCount: number;
  clusters: number;
  avgSim: number;
  RC: number;
  projectionVia?: "tsne-client" | "umap-server" | null;
};

export default function MetricsBar({ nodeCount, edgeCount, clusters, avgSim, RC, projectionVia }: Props) {
  const Item = ({ label, value }: { label: string; value: string }) => (
    <div className="px-2 py-1 rounded bg-neutral-900/70 border border-neutral-800">
      <span className="text-neutral-300 mr-2">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );

  return (
    <div className="flex gap-2 items-center text-xs">
      <Item label="#nodes" value={String(nodeCount)} />
      <Item label="#edges" value={String(edgeCount)} />
      <Item label="clusters" value={String(clusters)} />
      <Item label="avg sim" value={avgSim.toFixed(2)} />
      <Item label="RC" value={RC.toFixed(2)} />
      {projectionVia && <Item label="projection" value={projectionVia} />}
    </div>
  );
}
