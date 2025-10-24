"use client";
import { useMemo } from "react";
import { IdeaSchema, GraphEdge, GraphNode, NodeType } from "@/lib/models";
import { useGraphStore } from "@/state/graphStore";
import { exportResonanceFile, saveProject } from "@/lib/persist";

function toSchema(nodes: GraphNode[], edges: GraphEdge[]): IdeaSchema {
  const problems = nodes.filter(n=>n.type==="Problem").map(n=>n.title);
  const mechanisms = nodes.filter(n=>n.type==="Mechanism").map(n=>n.title);
  const outcomes = nodes.filter(n=>n.type==="Outcome").map(n=>n.title);

  const schema: IdeaSchema = {
    nodes, edges,
    summary: {
      problems,
      mechanisms,
      outcomes,
      openQuestions: [], // v1: leave empty without LLM
      assumptions: [],
    },
    metrics: {
      selectionSize: nodes.length,
      typedCoverage: nodes.length ? nodes.filter(n=>n.type!=="Note").length / nodes.length : 0,
      edgeDensity: nodes.length ? edges.length / nodes.length : 0,
    },
    version: "2.0.0",
  };
  return schema;
}

function toMarkdown(schema: IdeaSchema): string {
  const { summary } = schema;
  return [
    `# Idea Spec (v${schema.version})`,
    `## Problems`, ...summary.problems.map(p=>`- ${p}`),
    `\n## Mechanisms`, ...summary.mechanisms.map(m=>`- ${m}`),
    `\n## Outcomes`, ...summary.outcomes.map(o=>`- ${o}`),
    `\n## Risks`, `- (fill)`,
    `\n## Next Steps`, `- (fill)`
  ].join("\n");
}

export default function SchemaPanel() {
  const { nodes, edges, selection, viewMode } = useGraphStore(s=>s);

  const selectedNodes = useMemo(()=>{
    if (selection.nodes.size===0) return Object.values(nodes);
    return Array.from(selection.nodes).map(id=>nodes[id]).filter(Boolean);
  }, [selection, nodes]);

  const selectedEdges = useMemo(()=>{
    if (selection.nodes.size===0) return Object.values(edges);
    const allowed = new Set(selectedNodes.map(n=>n.id));
    return Object.values(edges).filter(e=>allowed.has(e.from)&&allowed.has(e.to));
  }, [selection, edges, selectedNodes]);

  const schema = useMemo(()=>toSchema(selectedNodes, selectedEdges), [selectedNodes, selectedEdges]);
  const md = useMemo(()=>toMarkdown(schema), [schema]);

  async function downloadJSON() {
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "schema.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadMD() {
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "spec.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadResonance() {
    const file = await exportResonanceFile({
      id: `proj_${Date.now()}`,
      name: "export",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: {
        nodes: Object.values(nodes),
        edges: Object.values(edges),
        viewMode,
      }
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = "project.resonance";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="p-3 space-y-3 text-sm">
      <div className="text-lg font-semibold text-white">Schema Builder</div>
      <div className="text-neutral-300">Selection: {selectedNodes.length} nodes, {selectedEdges.length} edges</div>

      <div className="flex gap-2">
        <button onClick={downloadJSON} className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white">Export schema.json</button>
        <button onClick={downloadMD} className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white">Export spec.md</button>
        <button onClick={downloadResonance} className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white">Export .resonance</button>
      </div>

      <pre className="bg-neutral-950 border border-neutral-800 rounded p-2 max-h-80 overflow-auto text-xs text-neutral-200">{JSON.stringify(schema, null, 2)}</pre>
    </div>
  );
}
