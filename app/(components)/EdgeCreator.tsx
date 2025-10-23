"use client";

import { useState, useEffect } from "react";
import { useGraphStore } from "@/state/graphStore";
import { EdgeType } from "@/lib/models";

const EDGE_TYPES: EdgeType[] = ["solves", "causes", "depends_on", "leads_to", "contradicts", "relates_to"];

interface EdgeCreatorProps {
  getNodeAtPosition: (x: number, y: number) => string | null;
}

export default function EdgeCreator({ getNodeAtPosition }: EdgeCreatorProps) {
  const { addEdge } = useGraphStore((s) => ({ addEdge: s.addEdge }));
  const [edgeMode, setEdgeMode] = useState(false);
  const [sourceNode, setSourceNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState<{ x: number; y: number; from: string; to: string } | null>(null);

  // Toggle edge creation mode with 'E' key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "e" || e.key === "E") {
        setEdgeMode((prev) => !prev);
        setSourceNode(null);
        setMousePos(null);
      }
      if (e.key === "Escape") {
        setEdgeMode(false);
        setSourceNode(null);
        setMousePos(null);
        setShowTypeMenu(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Handle clicks when in edge mode
  useEffect(() => {
    if (!edgeMode) return;

    function handleClick(e: MouseEvent) {
      const nodeId = getNodeAtPosition(e.clientX, e.clientY);

      if (!sourceNode) {
        // First click - select source node
        if (nodeId) {
          setSourceNode(nodeId);
          setMousePos({ x: e.clientX, y: e.clientY });
        }
      } else {
        // Second click - select target node
        if (nodeId && nodeId !== sourceNode) {
          setShowTypeMenu({ x: e.clientX, y: e.clientY, from: sourceNode, to: nodeId });
          setSourceNode(null);
          setMousePos(null);
        } else {
          // Clicked elsewhere - cancel
          setSourceNode(null);
          setMousePos(null);
        }
      }
    }

    function handleMove(e: MouseEvent) {
      if (sourceNode) {
        setMousePos({ x: e.clientX, y: e.clientY });
      }
    }

    window.addEventListener("click", handleClick);
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("mousemove", handleMove);
    };
  }, [edgeMode, sourceNode, getNodeAtPosition]);

  function createEdge(type: EdgeType) {
    if (showTypeMenu) {
      addEdge(showTypeMenu.from, showTypeMenu.to, type);
      setShowTypeMenu(null);
      setEdgeMode(false);
    }
  }

  return (
    <>
      {/* Edge creation mode indicator */}
      {edgeMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg">
          {sourceNode ? "Click target node" : "Click source node"} • Press ESC to cancel
        </div>
      )}

      {/* Visual line from source to cursor */}
      {edgeMode && sourceNode && mousePos && (
        <svg className="fixed inset-0 pointer-events-none z-40" style={{ width: "100vw", height: "100vh" }}>
          <line
            x1={mousePos.x}
            y1={mousePos.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        </svg>
      )}

      {/* Edge type selection menu */}
      {showTypeMenu && (
        <div
          className="fixed z-50 bg-neutral-900 border border-neutral-700 rounded shadow-lg p-2"
          style={{ left: showTypeMenu.x, top: showTypeMenu.y }}
        >
          <div className="text-xs text-neutral-400 mb-2 px-2">Select edge type:</div>
          <div className="grid grid-cols-2 gap-1">
            {EDGE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => createEdge(type)}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-sm text-left"
              >
                {type}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTypeMenu(null)}
            className="w-full mt-2 px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
