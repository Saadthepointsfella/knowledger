import nlp from "compromise";
import { NodeType, EdgeType, GraphNode } from "./models";
import { cosine } from "./cosine";

const problemCues = [/can't|cannot|hard to|difficult|lack|issue|problem|blocked|friction|\?$/i];
const mechanismVerbs = /\b(use|apply|build|design|algorithm|module|flow|system|pipeline|process|mechanism)\b/i;
const outcomeCues = /\b(so that|results? in|leads? to|increase|decrease|improve|reduce|boost|kpi|roi|benefit)\b/i;

export function suggestNodeType(text: string): { type: NodeType | null; confidence: number } {
  const doc = nlp(text);
  const t = text.toLowerCase();

  if (problemCues.some(r => r.test(t))) return { type: "Problem", confidence: 0.7 };
  if (mechanismVerbs.test(t)) return { type: "Mechanism", confidence: 0.6 };
  if (outcomeCues.test(t)) return { type: "Outcome", confidence: 0.6 };

  const nouns = doc.nouns().out("array") as string[];
  if (nouns.length > 0) {
    // naive: entity vs common noun
    const proper = doc.match("#ProperNoun").out("array") as string[];
    if (proper.length) return { type: "Actor", confidence: 0.5 };
    return { type: "Resource", confidence: 0.4 };
  }

  return { type: "Note", confidence: 0.3 };
}

export function suggestEdgeType(a: GraphNode, b: GraphNode): EdgeType | null {
  // simple schema: Problem -> Mechanism / Outcome, Mechanism -> Outcome, otherwise relates_to
  if (a.type === "Problem" && b.type === "Mechanism") return "solves";
  if (a.type === "Mechanism" && b.type === "Outcome") return "leads_to";
  if (a.type === "Problem" && b.type === "Outcome") return "leads_to";
  return "relates_to";
}

export function edgeWeightDefault(a: GraphNode, b: GraphNode): number {
  if (!a.vec?.length || !b.vec?.length) return 0.5;
  return Math.max(0, Math.min(1, cosine(a.vec, b.vec)));
}
