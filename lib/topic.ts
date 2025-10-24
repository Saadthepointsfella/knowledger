// apps/web/lib/topic.ts
// No-LLM cluster labeling: TF-IDF vs global + noun phrase extraction via compromise
import nlp from "compromise";

const STOP = new Set<string>([
  "the","a","an","and","or","but","of","in","on","for","to","from","with","by",
  "is","are","was","were","be","been","being","as","at","that","this","these","those",
  "it","its","they","them","he","she","we","you","i","my","your","our","their",
  "not","no","yes","if","then","than","so","such","can","could","should","would",
  "about","into","over","under","between","within","without","across","after","before",
  "also","more","most","much","many","some","any","each","every","other","another",
]);

function normalizeToken(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\- ]+/g, "").trim();
}

function extractCandidateTokens(text: string): string[] {
  // Use compromise to pull noun phrases and proper nouns; fallback to simple tokens
  const doc = nlp(text);
  const nounPhrases = doc.nouns().out("array") as string[];
  const props = doc.match("#ProperNoun").out("array") as string[];
  const raw = [...nounPhrases, ...props];

  const tokens: string[] = [];
  for (const phrase of raw) {
    const clean = normalizeToken(phrase);
    if (!clean) continue;
    // split phrases to individual words while keeping hyphenated constructs
    clean.split(/\s+/).forEach(w => {
      const ww = normalizeToken(w);
      if (ww && !STOP.has(ww) && ww.length > 2) tokens.push(ww);
    });
    // also keep the multiword phrase (joined by hyphen) if length>1
    const hyph = clean.replace(/\s+/g, "-");
    if (hyph && hyph.includes("-")) tokens.push(hyph);
  }

  // If compromise extracted nothing, fallback to basic word tokens
  if (tokens.length === 0) {
    text
      .toLowerCase()
      .split(/[^a-z0-9\-]+/g)
      .map(normalizeToken)
      .filter(t => t && !STOP.has(t) && t.length > 2)
      .forEach(t => tokens.push(t));
  }

  return tokens;
}

type CorpusStats = {
  df: Map<string, number>;   // document frequency across all docs
  N: number;                 // number of docs
};

export function buildCorpusStats(docs: string[]): CorpusStats {
  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set<string>();
    const tokens = extractCandidateTokens(d);
    for (const tok of tokens) {
      if (seen.has(tok)) continue;
      seen.add(tok);
      df.set(tok, (df.get(tok) || 0) + 1);
    }
  }
  return { df, N: docs.length };
}

function tf(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

function tfidf(clusterDocs: string[], corpus: CorpusStats): Map<string, number> {
  // Aggregate TF over cluster, then apply IDF vs global corpus
  const agg = new Map<string, number>();
  for (const d of clusterDocs) {
    const tokens = extractCandidateTokens(d);
    const t = tf(tokens);
    for (const [k, v] of t) agg.set(k, (agg.get(k) || 0) + v);
  }

  const scores = new Map<string, number>();
  for (const [term, tfCount] of agg) {
    const df = corpus.df.get(term) || 1;
    const idf = Math.log((corpus.N + 1) / df); // +1 smoothing
    scores.set(term, tfCount * idf);
  }
  return scores;
}

/**
 * Check if term is redundant with any term in the chosen list
 */
function isRedundant(term: string, chosen: string[]): boolean {
  const normalized = term.replace(/[\s\-]+/g, "").toLowerCase();
  for (const existing of chosen) {
    const existingNorm = existing.replace(/[\s\-]+/g, "").toLowerCase();
    // Skip if this term is a substring of an existing term, or vice versa
    if (normalized.includes(existingNorm) || existingNorm.includes(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Pick a short, distinctive label using top TF-IDF tokens.
 * Preference order: hyphenated phrase > multiword phrase > single strong noun.
 * Removes redundant terms (substrings or superstrings of each other).
 */
export function labelFromClusterDocs(clusterDocs: string[], corpus: CorpusStats, maxTerms = 3): string {
  const scores = tfidf(clusterDocs, corpus);
  // Sort terms by score desc, prefer hyphenated / multiword phrases
  const terms = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

  const chosen: string[] = [];
  for (const [term] of terms) {
    // avoid overly generic or numeric-only
    if (/^\d+$/.test(term)) continue;
    // Skip if redundant with already chosen terms
    if (isRedundant(term, chosen)) continue;
    chosen.push(term);
    if (chosen.length >= maxTerms) break;
  }

  if (chosen.length === 0) return "community";
  // Normalize to kebab-case label
  const kebab = chosen
    .map(t => t.replace(/\s+/g, "-"))
    .join("-");
  // Keep it short
  return kebab.slice(0, 48);
}
