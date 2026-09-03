/**
 * Deterministic normalisers.
 *
 * These run BEFORE any matching or entity resolution. Everything downstream
 * compares normalised forms, never raw strings. No LLM is involved at this
 * layer — identifier normalisation must be reproducible and explainable.
 *
 * The messiness handled here is not hypothetical. The same Bengaluru parcel is
 * written as "Sy. No. 42/3", "42/3", "42-3" and "Survey No 42 / 3A" across a
 * sale deed, an EC and an RTC. The same person appears as "Vinay Kumar S",
 * "S. Vinay Kumar" and "Sri Vinay Kumar" in three documents.
 */

const HONORIFICS = new Set([
  "MR",
  "MRS",
  "MS",
  "SRI",
  "SHRI",
  "SMT",
  "KUM",
  "DR",
  "M/S",
  "MS.",
  "LATE",
]);

/** Relationship clauses that trail an Indian legal name and are not part of it. */
const RELATION_CLAUSE =
  /\b(s\/o|d\/o|w\/o|c\/o|son of|daughter of|wife of|aged about)\b.*$/i;

/**
 * Canonical survey number.
 *
 * "Sy. No. 42/3A" -> "42/3A"
 * "42-3"          -> "42/3"
 * "Survey No 42"  -> "42"
 */
export function normaliseSurveyNumber(raw: string): string {
  const stripped = raw
    .replace(/\b(survey|sy|s)\.?\s*(no|nos|number)\.?\s*/gi, "")
    .replace(/\bhissa\s*(no|number)?\.?\s*/gi, "/")
    .replace(/[\s]+/g, "")
    .replace(/[-–—]/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
    .toUpperCase();
  return stripped;
}

/**
 * Comparable key for a person name.
 *
 * Word tokens are sorted so that a trailing family initial and a leading one
 * collapse to the same key:
 *   "Vinay Kumar S"    -> "KUMAR|VINAY::S"
 *   "S. Vinay Kumar"   -> "KUMAR|VINAY::S"
 *   "Sri Vinay Kumar"  -> "KUMAR|VINAY::"
 *
 * Note the last two are NOT equal. That is intentional: dropping an initial is
 * a real difference and should surface as a name variant for a human to judge,
 * not be silently merged.
 */
export function personNameKey(raw: string): string {
  const cleaned = raw
    .replace(RELATION_CLAUSE, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const tokens = cleaned
    .split(" ")
    .filter((t) => t.length > 0 && !HONORIFICS.has(t));

  const words = tokens.filter((t) => t.length > 1).sort();
  const initials = tokens.filter((t) => t.length === 1).sort();

  return `${words.join("|")}::${initials.join("")}`;
}

/** Display form: honorifics and relation clauses removed, spacing tidied. */
export function displayPersonName(raw: string): string {
  return raw
    .replace(RELATION_CLAUSE, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,]$/, "");
}

/** "BNG-1-04521/2019-20" and "bng 1 04521 / 2019 20" collapse to one key. */
export function normaliseRegistrationNumber(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function normaliseIdentifier(raw: string): string {
  return raw.replace(/[^A-Za-z0-9/]/g, "").toUpperCase();
}

/**
 * Extent in square feet, when the unit is recognisable.
 *
 * Handles "1,200 Sq.Ft.", "1200 sqft", "2 Acres 15 Guntas", "0.5 acre".
 * Returns null when the string cannot be read confidently — a wrong number is
 * far worse than no number.
 */
export function extentToSqFt(raw: string): number | null {
  const text = raw.toLowerCase().replace(/,/g, "");

  const acreGunta = text.match(
    /(\d+(?:\.\d+)?)\s*(?:acres?|ac)\b(?:\s*(\d+(?:\.\d+)?)\s*(?:guntas?|g)\b)?/,
  );
  if (acreGunta) {
    const acres = Number(acreGunta[1] ?? 0);
    const guntas = Number(acreGunta[2] ?? 0);
    return Math.round(acres * 43560 + guntas * 1089);
  }

  const guntasOnly = text.match(/(\d+(?:\.\d+)?)\s*(?:guntas?|g)\b/);
  if (guntasOnly) return Math.round(Number(guntasOnly[1] ?? 0) * 1089);

  const sqft = text.match(/(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|square feet)/);
  if (sqft) return Math.round(Number(sqft[1] ?? 0));

  const sqm = text.match(/(\d+(?:\.\d+)?)\s*(?:sq\.?\s*m|sqm|square met)/);
  if (sqm) return Math.round(Number(sqm[1] ?? 0) * 10.7639);

  return null;
}

export function formatSqFt(sqft: number): string {
  return `${sqft.toLocaleString("en-IN")} sq ft`;
}

/** Levenshtein distance, iterative two-row form. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[b.length] ?? 0;
}

/** 0..1 similarity. Used only to *propose* a match for human review. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

/**
 * Matching bands for entity resolution. Nothing auto-merges below `certain`.
 * The middle band is a review queue, not a decision.
 */
export const MATCH_BANDS = {
  certain: 0.97,
  probable: 0.82,
} as const;

export type MatchVerdict = "same" | "review" | "different";

export function verdictFor(score: number): MatchVerdict {
  if (score >= MATCH_BANDS.certain) return "same";
  if (score >= MATCH_BANDS.probable) return "review";
  return "different";
}

/**
 * Content hash stand-in for the demo.
 *
 * The real pipeline hashes file bytes with SHA-256 in the intake stage. Here we
 * derive a stable 64-char hex digest from the file identity so duplicate
 * detection behaves identically without needing the actual bytes.
 */
export function demoContentHash(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let i = 0; i < seed.length; i += 1) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
  }
  let out = "";
  let a = h1;
  let b = h2;
  for (let i = 0; i < 8; i += 1) {
    a = Math.imul(a ^ (a >>> 15), 0x2545f491) >>> 0;
    b = Math.imul(b ^ (b >>> 13), 0x9e3779b1) >>> 0;
    out += a.toString(16).padStart(8, "0");
    if (out.length >= 64) break;
    out += b.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}
