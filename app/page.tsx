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
import { generateEmbeddings, initEmbeddings } from "@/lib/embedClient";

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
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState<string | null>(null);

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

      // Initialize model if needed (first time will download ~23MB)
      setModelLoading(true);
      setModelProgress("Loading embedding model...");
      await initEmbeddings((progress) => {
        if (progress.status === "downloading") {
          const pct = progress.loaded && progress.total
            ? Math.round((progress.loaded / progress.total) * 100)
            : 0;
          setModelProgress(`Downloading model: ${pct}%`);
        } else if (progress.status === "loading") {
          setModelProgress("Loading model into memory...");
        }
      });
      setModelLoading(false);
      setModelProgress(null);

      // Generate embeddings client-side
      const vecs = await generateEmbeddings(chunks, {
        batchSize: cfg.embed.batchSize,
        onProgress: (current, total) => {
          const pct = Math.round((current / total) * 100);
          setModelProgress(`Generating embeddings: ${pct}%`);
        },
      });
      setModelProgress(null);

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
    <div className="flex h-screen w-full bg-black">
      {/* 🌌 Main: Constellation (Full Focus) */}
      <div className="flex-1 relative overflow-hidden">
        {visible ? (
          <ForceGraphWrapper
            key={runVersion}
            proximityGraph={visible}
            labels={labels || undefined}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-neutral-500 max-w-md">
              <div className="text-xl mb-2">Semantic Constellation</div>
              <div className="text-sm">
                Paste your text in the sidebar and click Resonate to visualize
                the knowledge graph
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🎛️ Sidebar: All Controls */}
      <div className="w-80 bg-neutral-950 border-l border-neutral-800 flex flex-col overflow-hidden">
        {/* Header with metrics */}
        <div className="p-4 border-b border-neutral-800">
          <h1 className="text-[#F5F5DC] text-lg font-light mb-3">
            Knowledger
          </h1>
          {metrics && (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Nodes</span>
                <span className="text-neutral-300">{metrics.nodeCount}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Edges</span>
                <span className="text-neutral-300">{metrics.edgeCount}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Communities</span>
                <span className="text-neutral-300">{metrics.clusters}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Avg Similarity</span>
                <span className="text-neutral-300">
                  {metrics.avgSim.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 uppercase tracking-wide">
              Input Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your text here..."
              className="w-full h-32 p-2 text-sm rounded bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
            />
            <button
              onClick={run}
              disabled={!text || loading}
              className="w-full px-3 py-2 text-sm rounded bg-neutral-800 text-[#F5F5DC] hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Computing…" : "Resonate"}
            </button>
            {modelProgress && (
              <div className="text-xs text-neutral-500">{modelProgress}</div>
            )}
            {error && <div className="text-xs text-red-500">{error}</div>}
          </div>

          {/* Graph Parameters */}
          {graph && (
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 uppercase tracking-wide">
                Graph Parameters
              </label>
              <ControlsPanel
                defaultThreshold={cfg.graph.simThreshold}
                defaultK={cfg.graph.kDesktop}
                onChange={onParamsChange}
              />
            </div>
          )}

          {/* Simulation Controls */}
          {graph && (
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 uppercase tracking-wide">
                Simulation
              </label>
              <SimulationPanel />
            </div>
          )}

          {/* Communities */}
          {graph && (
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 uppercase tracking-wide">
                Communities
              </label>
              <CommunityPanel
                nodes={graph.nodes as any}
                activeCommunity={activeCommunity}
                onSelectCommunity={setActiveCommunity}
                labels={labels || undefined}
              />
            </div>
          )}

          {/* Community Inspector */}
          {visible && activeCommunity != null && (
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 uppercase tracking-wide">
                Community Details
              </label>
              <div className="rounded border border-neutral-800 p-2 bg-neutral-900">
                <CommunityInspector
                  proximityGraph={visible}
                  communityId={activeCommunity}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
