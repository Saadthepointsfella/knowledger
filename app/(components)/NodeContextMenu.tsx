"use client";
import { NodeType } from "@/lib/models";
import { useEffect, useRef } from "react";

const TYPES: NodeType[] = ["Problem","Insight","Mechanism","Outcome","Actor","Resource","Note"];

export default function NodeContextMenu({
  x, y, visible, onPick, onDuplicate, onDelete, onClose, ghost
}:{
  x:number; y:number; visible:boolean;
  ghost?: NodeType | null;
  onPick:(t:NodeType)=>void;
  onDuplicate:()=>void;
  onDelete:()=>void;
  onClose:()=>void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div ref={ref} className="absolute z-50 bg-neutral-900 border border-neutral-700 rounded shadow-lg" style={{ left: x, top: y }}>
      <div className="p-2 text-xs text-neutral-400">Set Type</div>
      <div className="grid grid-cols-2 gap-1 p-2">
        {TYPES.map((t,i)=>(
          <button key={t} className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-left text-white" onClick={()=>onPick(t)}>
            {i+1}. {t}{ghost===t && <span className="ml-1 opacity-60">(suggested)</span>}
          </button>
        ))}
      </div>
      <div className="border-t border-neutral-800"/>
      <div className="p-2">
        <button className="w-full text-left px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white" onClick={onDuplicate}>Duplicate Node</button>
        <button className="w-full text-left px-2 py-1 rounded bg-red-900 hover:bg-red-800 text-white" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
