import dagre from "dagre";
import { GraphNode, GraphEdge } from "./models";

export function layoutStructure(nodes: GraphNode[], edges: GraphEdge[], rankdir: "TB"|"LR" = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach(n => g.setNode(n.id, { width: 140, height: 40 }));
  edges.forEach(e => g.setEdge(e.from, e.to));

  dagre.layout(g);
  const pos: Record<string, {x:number;y:number}> = {};
  g.nodes().forEach((id: string) => {
    const n = g.node(id);
    pos[id] = { x: n.x, y: n.y };
  });
  return pos;
}
