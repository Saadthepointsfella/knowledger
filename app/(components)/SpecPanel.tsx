// apps/web/app/(components)/SpecPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useModuleStore } from "@/state/moduleStore";
import { useGraphStore } from "@/state/graphStore";
import { graphToSpec, generatePrompt } from "@/lib/specCompiler";

/**
 * Right sidebar "Spec" tab.
 * - Edits IdeaModule fields
 * - Generate Spec from current module nodes
 * - Export JSON / Markdown
 * - Copy Prompt
 * - Shortcuts: Cmd/Ctrl+E export MD, Cmd/Ctrl+Shift+E open panel (handled here)
 */
export default function SpecPanel() {
  const {
    modules,
    currentModule,
    updateField,
    setModuleNodes,
    rename,
    exportModule,
    synthPrompt,
  } = useModuleStore();
  const { nodes } = useGraphStore();

  const mod = currentModule ? modules[currentModule] : null;
  const [localTitle, setLocalTitle] = useState(mod?.title || "");

  useEffect(() => setLocalTitle(mod?.title || ""), [mod?.title]);

  // Resolve module nodes from graph store
  const moduleNodeObjs = useMemo(
    () => (mod ? mod.nodes.map((id) => nodes[id]).filter(Boolean) : []),
    [mod, nodes]
  );

  function onGenerate() {
    if (!mod) return;
    const compiled = graphToSpec(moduleNodeObjs as any, []);
    updateField(mod.id, "summary", compiled.summary);
    updateField(mod.id, "problem", compiled.problem);
    updateField(mod.id, "mechanism", compiled.mechanism);
    updateField(mod.id, "outcome", compiled.outcome);
  }

  async function onCopyPrompt() {
    if (!mod) return;
    const p = generatePrompt(mod);
    try {
      await navigator.clipboard.writeText(p);
    } catch {
      // Fallback: open a blob
      const blob = new Blob([p], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (!modKey) return;
      if (!mod) return;

      // Cmd/Ctrl + E -> export MD
      if (e.key.toLowerCase() === "e" && !e.shiftKey) {
        e.preventDefault();
        exportModule(mod.id, "md");
      }
      // Cmd/Ctrl + Shift + E -> open spec panel (noop here; panel already open)
      if (e.key.toLowerCase() === "e" && e.shiftKey) {
        e.preventDefault();
        // No-op: panel hosting component can switch tabs if needed.
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mod, exportModule]);

  if (!mod) {
    return (
      <div className="p-4 text-sm text-neutral-400">
        Select a cluster or subgraph to create a module, then open **Spec**.
      </div>
    );
  }

  const statusColor =
    mod.status === "exported"
      ? "bg-green-600/20 text-green-300 border-green-600/40"
      : mod.status === "generated"
      ? "bg-blue-600/20 text-blue-300 border-blue-600/40"
      : mod.status === "implemented"
      ? "bg-emerald-700/20 text-emerald-300 border-emerald-700/40"
      : "bg-amber-600/20 text-amber-300 border-amber-600/40"; // draft

  return (
    <div className="p-3 space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={() => rename(mod.id, localTitle.trim() || "Untitled Module")}
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 font-medium"
        />
        <span className={`px-2 py-1 rounded border ${statusColor}`}>
          {mod.status} · v{mod.version}
        </span>
      </div>

      <div className="grid gap-3">
        {/* Summary */}
        <FieldArea
          label="Summary"
          value={mod.spec.summary}
          onChange={(v) => updateField(mod.id, "summary", v)}
          rows={2}
        />
        <FieldArea
          label="Problem"
          value={mod.spec.problem}
          onChange={(v) => updateField(mod.id, "problem", v)}
          rows={3}
        />
        <FieldArea
          label="Mechanism"
          value={mod.spec.mechanism}
          onChange={(v) => updateField(mod.id, "mechanism", v)}
          rows={3}
        />
        <FieldArea
          label="Outcome"
          value={mod.spec.outcome}
          onChange={(v) => updateField(mod.id, "outcome", v)}
          rows={3}
        />
        <FieldArea
          label="User (optional)"
          value={mod.spec.user || ""}
          onChange={(v) => updateField(mod.id, "user", v)}
          rows={2}
        />
        <FieldArea
          label="Metrics (one per line)"
          value={(mod.spec.metrics || []).join("\n")}
          onChange={(v) => updateField(mod.id, "metrics", v)}
          rows={3}
          mono
        />
        <FieldArea
          label="Next Steps (one per line)"
          value={(mod.spec.nextSteps || []).join("\n")}
          onChange={(v) => updateField(mod.id, "nextSteps", v)}
          rows={3}
          mono
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onGenerate}
          className="px-3 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
          title="Generate Spec from typed nodes (Problem, Mechanism, Outcome)"
        >
          Generate Spec
        </button>
        <button
          onClick={() => exportModule(mod.id, "json")}
          className="px-3 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
          title="⌘/Ctrl+E exports Markdown; this exports JSON"
        >
          Export JSON
        </button>
        <button
          onClick={() => exportModule(mod.id, "md")}
          className="px-3 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
          title="⌘/Ctrl+E"
        >
          Export Markdown
        </button>
        <button
          onClick={onCopyPrompt}
          className="px-3 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
        >
          Copy Prompt
        </button>
      </div>

      <div className="text-xs text-neutral-500">
        Nodes in module: {mod.nodes.length} · Updated:{" "}
        {new Date(mod.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  rows = 3,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block font-mono text-[11px] uppercase tracking-wide text-neutral-400">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full mt-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}
