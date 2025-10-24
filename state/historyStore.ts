import { StateCreator, create } from "zustand/vanilla";
import { useGraphStore } from "./graphStore";

/**
 * Minimal undo/redo ring buffer for node edits.
 * Stores {id, text, vec, x, y} diffs.
 */
type Edit = { id: string; prev: any; next: any };
type HistoryState = {
  past: Edit[];
  future: Edit[];
  push: (e: Edit) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
};

export const historyStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  push: (e) => set((s) => ({ past: [...s.past, e], future: [] })),
  undo: () => {
    const { past, future } = get();
    if (!past.length) return;
    const edit = past[past.length - 1];
    useGraphStore.getState().applyNodePatch(edit.id, edit.prev);
    set({ past: past.slice(0, -1), future: [edit, ...future] });
  },
  redo: () => {
    const { past, future } = get();
    if (!future.length) return;
    const edit = future[0];
    useGraphStore.getState().applyNodePatch(edit.id, edit.next);
    set({ past: [...past, edit], future: future.slice(1) });
  },
  clear: () => set({ past: [], future: [] }),
}));

// Global keybindings (mounted once from app layout, or call manually)
export function bindHistoryShortcuts() {
  function onKey(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) historyStore.getState().redo();
      else historyStore.getState().undo();
    }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
