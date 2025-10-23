"use client";
import { useCallback, useMemo, useState } from "react";
import { cfg } from "@/lib/cfg";
import { naiveSentenceSplit } from "@/lib/chunk";
import type { Graph } from "@/lib/types";
import { projectVectors } from "@/lib/project";
import { computeLouvain } from "@/lib/cluster";
import { metricsBundle } from "@/lib/metrics";
import MetricsBar from "./(components)/MetricsBar";
import ControlsPanel from "./(components)/ControlsPanel";
import CommunityPanel from "./(components)/CommunityPanel";
import { makeVisibleGraph } from "@/lib/visibleGraph";
import ForceGraphWrapper from "./(components)/ForceGraphWrapper";
import { computeCommunityLabels } from "@/lib/labels";
import { useGraphStore } from "@/state/graphStore";
import CommunityInspector from "./(components)/CommunityInspector";
import SimulationPanel from "./(components)/SimulationPanel"; // 🧩 Phase 3

export default function Page() {
  const { upsertFromPhase1 } = useGraphStore();
  const [text, setText] = useState("");
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectionVia, setProjectionVia] =
    useState<"tsne-client" | "umap-server" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runVersion, setRunVersion] = useState(0);

  const [metrics, setMetrics] = useState<{
    nodeCount: number;
    edgeCount: number;
    clusters: number;
    avgSim: number;
    RC: number;
  } | null>(null);

  const [embeddings, setEmbeddings] = useState<number[][] | null>(null);
  const [texts, setTexts] = useState<string[] | null>(null);
  const [params, setParams] = useState<{ threshold: number; k: number }>({
    threshold: cfg.graph.simThreshold,
    k: cfg.graph.kDesktop,
  });
  const [activeCommunity, setActiveCommunity] = useState<number | null>(null);
  const [labels, setLabels] = useState<Record<number, string> | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setGraph(null);
    setProjectionVia(null);
    setMetrics(null);
    setActiveCommunity(null);
    setLabels(null);

    try {
      const chunks = naiveSentenceSplit(text)
        .map((c) => c.text)
        .filter(Boolean);
      if (chunks.length === 0) {
        setError("No chunkable text detected.");
        return;
      }

      const embRes = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunks,
          model: cfg.embed.model,
          batchSize: cfg.embed.batchSize,
        }),
      });
      if (!embRes.ok) {
        if (embRes.status === 413)
          throw new Error(
            "Text is too large. Please try with smaller content (≤ ~50k chars)."
          );
        const ct = embRes.headers.get("content-type");
        if (ct?.includes("application/json")) {
          const j = await embRes.json();
          throw new Error(j?.error || j?.message || "Embedding request failed");
        }
        throw new Error(
          `Embedding request failed (${embRes.status} ${embRes.statusText})`
        );
      }
      const { embeddings: vecs } = await embRes.json();

      const anRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: chunks,
          embeddings: vecs,
          params: {
            k: cfg.graph.kDesktop,
            threshold: cfg.graph.simThreshold,
          },
        }),
      });
      if (!anRes.ok) {
        if (anRes.status === 413)
          throw new Error("Data is too large. Please try with smaller content.");
        const ct = anRes.headers.get("content-type");
        if (ct?.includes("application/json")) {
          const j = await anRes.json();
          throw new Error(j?.error || j?.message || "Analyze request failed");
        }
        throw new Error(
          `Analyze request failed (${anRes.status} ${anRes.statusText})`
        );
      }
      const { graph: g } = await anRes.json();

      const { coords, via } = await projectVectors(vecs);
      setProjectionVia(via);

      const projected: Graph = {
        ...g,
        nodes: g.nodes.map((n: any, i: number) => ({
          ...n,
          x: coords[i]?.[0],
          y: coords[i]?.[1],
        })),
      };

      const { graph: withCommunities, clusters } = computeLouvain(projected, 1.0);

      if (chunks.length < 500) {
        const textsById = new Map<string, string>();
        withCommunities.nodes.forEach((n: any) => {
          const idx = parseInt(n.id, 10);
          const t = chunks[idx];
          if (typeof t === "string") textsById.set(n.id, t);
        });
        const lbls = computeCommunityLabels(withCommunities, textsById);
        setLabels(lbls);
      } else {
        setLabels(null);
      }

      const mb = metricsBundle(withCommunities, clusters);
      setMetrics(mb);
      setEmbeddings(vecs);
      setTexts(chunks);
      setParams({
        threshold: cfg.graph.simThreshold,
        k: cfg.graph.kDesktop,
      });
      setGraph(withCommunities);

      // ✅ Phase 2 → 3 store update
      upsertFromPhase1(withCommunities, chunks, vecs);

      setRunVersion((v) => v + 1);
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  const onParamsChange = useCallback(
    async (p: { threshold: number; k: number }) => {
      setParams(p);
      if (!embeddings || !texts) return;
      try {
        const anRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts,
            embeddings,
            params: { k: p.k, threshold: p.threshold },
          }),
        });
        if (!anRes.ok) {
          if (anRes.status === 413) {
            setError("Data is too large. Please try with smaller content.");
            return;
          }
          const ct = anRes.headers.get("content-type");
          if (ct?.includes("application/json")) {
            const j = await anRes.json();
            setError(j?.error || j?.message || "Failed to re-analyze graph");
          } else {
            setError(`Failed to re-analyze graph (${anRes.status})`);
          }
          return;
        }

        const { graph: g2 } = await anRes.json();

        let gProjected: Graph;
        if (graph && g2.nodes.length === graph.nodes.length) {
          const xy = new Map(graph.nodes.map((n: any) => [n.id, [n.x, n.y]]));
          gProjected = {
            ...g2,
            nodes: g2.nodes.map((n: any) => {
              const c = xy.get(n.id);
              return c ? { ...n, x: c[0], y: c[1] } : n;
            }),
          };
        } else {
          const { coords } = await projectVectors(embeddings);
          gProjected = {
            ...g2,
            nodes: g2.nodes.map((n: any, i: number) => ({
              ...n,
              x: coords[i][0],
              y: coords[i][1],
            })),
          };
        }

        const { graph: gWithCom, clusters } = computeLouvain(gProjected, 1.0);
        const mb = metricsBundle(gWithCom, clusters);
        setMetrics(mb);
        setGraph(gWithCom);

        if (texts && texts.length < 500) {
          const map = new Map<string, string>();
          gWithCom.nodes.forEach((n: any) => {
            const t = texts[parseInt(n.id, 10)];
            if (t) map.set(n.id, t);
          });
          setLabels(computeCommunityLabels(gWithCom, map));
        } else {
          setLabels(null);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to update graph parameters");
      }
    },
    [embeddings, texts, graph]
  );

  const visible = useMemo(() => {
    if (!graph) return null;
    return makeVisibleGraph(graph, { communityId: activeCommunity });
  }, [graph, activeCommunity]);

  return (
    <div className="flex flex-col h-screen w-full bg-black">
      {/* 🌌 Top Half: Constellation */}
      <div className="h-1/2 w-full rounded bg-black border-2 border-neutral-800 relative overflow-hidden">
        {metrics && (
          <div className="absolute right-4 top-4 z-10">
            <MetricsBar
              nodeCount={metrics.nodeCount}
              edgeCount={metrics.edgeCount}
              clusters={metrics.clusters}
              avgSim={metrics.avgSim}
              RC={metrics.RC}
              projectionVia={projectionVia}
            />
          </div>
        )}

        {visible ? (
          <ForceGraphWrapper
            key={runVersion}
            proximityGraph={visible}
            labels={labels || undefined}
          />
        ) : (
          <div className="p-6 text-neutral-400">
            Paste text and click{" "}
            <b className="text-white">Resonate</b> to see the semantic constellation.
          </div>
        )}
      </div>

      {/* 🧭 Bottom Half: Controls */}
      <div className="h-1/2 w-full p-4 overflow-auto bg-black">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-4">
          {/* ✍️ Left: Input */}
          <div className="col-span-1 space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste text here (≤ 50k chars)"
              className="w-full h-64 p-3 rounded bg-white border-2 border-neutral-800 text-neutral-900"
            />
            <button
              onClick={run}
              disabled={!text || loading}
              className="w-full px-4 py-2 rounded bg-neutral-900 text-[#F5F5DC] hover:bg-neutral-800 disabled:opacity-50 border-2 border-neutral-900"
            >
              {loading ? "Computing…" : "Resonate"}
            </button>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>

          {/* ⚙️ Middle: Threshold / K */}
          <div className="col-span-1 space-y-2">
            <ControlsPanel
              defaultThreshold={cfg.graph.simThreshold}
              defaultK={cfg.graph.kDesktop}
              onChange={onParamsChange}
            />
            {/* 🧩 Added Simulation Controls */}
            {graph && (
              <div className="mt-3">
                <SimulationPanel />
              </div>
            )}
          </div>

          {/* 🌐 Right: Community Panel + Inspector */}
          <div className="col-span-1 space-y-3">
            {graph && (
              <>
                <CommunityPanel
                  nodes={graph.nodes as any}
                  activeCommunity={activeCommunity}
                  onSelectCommunity={setActiveCommunity}
                  labels={labels || undefined}
                />
                {visible && activeCommunity != null && (
                  <div className="mt-3 rounded border border-neutral-800 p-2">
                    <CommunityInspector
                      proximityGraph={visible}
                      communityId={activeCommunity}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
