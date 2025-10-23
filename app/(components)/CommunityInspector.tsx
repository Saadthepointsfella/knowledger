"use client";

import { useMemo } from "react";
import type { Graph } from "@/lib/types";
import { useGraphStore } from "@/state/graphStore";
import { summarizeCommunity } from "@/lib/inspector";

type Props = { proximityGraph: Graph; communityId: number | null };

export default function CommunityInspector({ proximityGraph, communityId }: Props) {
  const { nodes } = useGraphStore((s) => ({ nodes: s.nodes }));
  const summary = useMemo(() => {
    if (communityId == null) return null;
    return summarizeCommunity(communityId, proximityGraph, nodes);
  }, [communityId, proximityGraph, nodes]);

  if (!summary) {
    return <div className="text-sm text-neutral-400 p-2">Select a community to inspect.</div>;
  }

  const md = [
    `### Community ${summary.community} (n=${summary.size})`,
    `**Keywords:** ${summary.keywords.join(", ") || "—"}`,
    `**Representatives:**`,
    ...summary.representatives.map((r) => `- (${r.score.toFixed(2)}) ${r.text.slice(0, 140)}${r.text.length>140?"…":""}`),
  ].join("\n");

  const json = JSON.stringify(summary, null, 2);

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="text-neutral-300">Community {summary.community}</div>
      <div><span className="text-neutral-400">Size:</span> {summary.size}</div>
      <div><span className="text-neutral-400">Keywords:</span> {summary.keywords.join(", ") || "—"}</div>
      <div className="space-y-1">
        <div className="text-neutral-400">Representatives:</div>
        <ul className="list-disc pl-5">
          {summary.representatives.map((r) => (
            <li key={r.id} className="text-neutral-200">
              {r.text.slice(0, 160)}{r.text.length>160?"…":""}
              <span className="text-neutral-500"> ({r.score.toFixed(2)})</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2">
        <button onClick={() => copy(md)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">Copy Markdown</button>
        <button onClick={() => copy(json)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-800">Copy JSON</button>
      </div>
    </div>
  );
}
