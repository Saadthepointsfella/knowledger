import JSZip from "jszip";
import { GraphNode, GraphEdge, ViewMode } from "./models";

const DB_NAME = "resonator_db";
const STORE = "projects";

type ProjectFile = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    viewMode: ViewMode;
  };
};

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(p: ProjectFile) {
  const db = await idb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(p);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadProject(id: string): Promise<ProjectFile | undefined> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listProjects(): Promise<ProjectFile[]> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as ProjectFile[]);
    req.onerror = () => reject(req.error);
  });
}

export async function exportResonanceFile(p: ProjectFile): Promise<Blob> {
  const zip = new JSZip();
  const graphJson = JSON.stringify(p.data, null, 2);
  zip.file("graph.json", graphJson);
  // embeddings.bin optional: we keep inside nodes.vec already
  return zip.generateAsync({ type: "blob" });
}

export async function importResonanceFile(file: File): Promise<ProjectFile> {
  const zip = await JSZip.loadAsync(file);
  const graphJson = await zip.file("graph.json")!.async("string");
  const data = JSON.parse(graphJson);
  const now = Date.now();
  return {
    id: `proj_${now}`,
    name: file.name.replace(/\.resonance$/,""),
    createdAt: now,
    updatedAt: now,
    data,
  };
}
