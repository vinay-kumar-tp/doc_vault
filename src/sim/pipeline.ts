import type {
  DocumentTypeId,
  PipelineStageId,
  PipelineStageState,
} from "@/domain/types";
import { documentTypeMeta } from "@/domain/document-types";

/**
 * Simulated ingestion pipeline.
 *
 * The stage graph, the ordering, the retry semantics and the cost accounting are
 * the real design. Only the work inside each stage is faked. Swapping the fake
 * OCR and extraction steps for Azure Document Intelligence and an LLM call does
 * not change anything else in this file's structure.
 *
 * Two deliberate departures from a naive reading of the pipeline sketch:
 *
 *  1. Exact-hash duplicate detection runs SECOND, immediately after intake,
 *     before OCR. Running it after extraction — as a linear reading of the
 *     stage list would suggest — means paying for OCR and LLM tokens on a file
 *     you already hold. Near-duplicate detection (OCR text similarity, vector
 *     search) still has to happen later, because it needs the text.
 *
 *  2. Every stage is independently retryable and records its attempt count. A
 *     transient OCR provider failure retries that stage only; it does not
 *     restart the document.
 */

export type StageWorkload = "none" | "ocr" | "llm";

export interface StageSpec {
  id: PipelineStageId;
  label: string;
  /** Deterministic stages produce identical output for identical input. */
  deterministic: boolean;
  workload: StageWorkload;
  /** Simulated duration at 1x speed. */
  durationMs: number;
  /** Shown in the stage list so the pipeline explains itself. */
  purpose: string;
}

export const PIPELINE_STAGES: StageSpec[] = [
  {
    id: "intake",
    label: "Intake & hash",
    deterministic: true,
    workload: "none",
    durationMs: 420,
    purpose:
      "Validate MIME type against the allowlist, enforce the size cap, compute the SHA-256 content hash.",
  },
  {
    id: "dedupe",
    label: "Duplicate detection",
    deterministic: true,
    workload: "none",
    durationMs: 380,
    purpose:
      "Compare the content hash against documents already on this property. Runs before OCR so a duplicate costs nothing.",
  },
  {
    id: "virus_scan",
    label: "Malware scan",
    deterministic: true,
    workload: "none",
    durationMs: 640,
    purpose: "Scan the uploaded bytes before anything else is allowed to read them.",
  },
  {
    id: "store_original",
    label: "Store original",
    deterministic: true,
    workload: "none",
    durationMs: 520,
    purpose:
      "Write the immutable original to object storage and open a new document version. Originals are never mutated.",
  },
  {
    id: "ocr",
    label: "OCR",
    deterministic: false,
    workload: "ocr",
    durationMs: 2200,
    purpose:
      "Convert scanned pages to text with per-word confidence. The dominant cost in the pipeline.",
  },
  {
    id: "layout",
    label: "Layout analysis",
    deterministic: false,
    workload: "ocr",
    durationMs: 900,
    purpose:
      "Detect tables, key-value regions and reading order. An EC entry table is worthless as flat text.",
  },
  {
    id: "classify",
    label: "Classification",
    deterministic: false,
    workload: "llm",
    durationMs: 1100,
    purpose:
      "Assign a document type from the v1 taxonomy with a confidence score. Below threshold it stays unclassified rather than guessing.",
  },
  {
    id: "extract_entities",
    label: "Entity extraction",
    deterministic: false,
    workload: "llm",
    durationMs: 2600,
    purpose:
      "Pull the field set for the classified type. Every field carries a page reference and a confidence.",
  },
  {
    id: "extract_relationships",
    label: "Relationship extraction",
    deterministic: false,
    workload: "llm",
    durationMs: 1500,
    purpose:
      "Read the links between entities: who transferred to whom, which parent document is relied on, which office registered it.",
  },
  {
    id: "canonical_map",
    label: "Canonical mapping",
    deterministic: true,
    workload: "none",
    durationMs: 780,
    purpose:
      "Normalise identifiers and resolve entities against those already known. Nothing merges below the certainty threshold.",
  },
  {
    id: "graph_update",
    label: "Graph update",
    deterministic: true,
    workload: "none",
    durationMs: 620,
    purpose:
      "Write nodes and edges, each tagged with the documents that assert it.",
  },
  {
    id: "compliance_eval",
    label: "Rule evaluation",
    deterministic: true,
    workload: "none",
    durationMs: 700,
    purpose:
      "Re-run the versioned checklist and the cross-document consistency checks. No model participates.",
  },
  {
    id: "index",
    label: "Search index",
    deterministic: true,
    workload: "none",
    durationMs: 460,
    purpose: "Update the full-text and vector indexes for this property.",
  },
];

export function createInitialStages(): PipelineStageState[] {
  return PIPELINE_STAGES.map((spec) => ({
    id: spec.id,
    label: spec.label,
    status: "pending",
    attempts: 0,
    deterministic: spec.deterministic,
  }));
}

export function stageSpec(id: PipelineStageId): StageSpec {
  const found = PIPELINE_STAGES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown pipeline stage: ${id}`);
  return found;
}

/* ------------------------------------------------------------- run planning */

export type RunOutcome =
  | "clean"
  | "needs_review"
  | "duplicate"
  | "transient_failure";

export interface StageStep {
  stage: PipelineStageId;
  durationMs: number;
  /** When set, the stage fails on this attempt and is retried. */
  failWith?: string;
  detail: string;
}

export interface RunPlan {
  steps: StageStep[];
  /** Stage after which the run stops early, if any. */
  haltAfter?: PipelineStageId;
  finalStatus: "ready" | "needs_review" | "duplicate";
}

interface PlanInput {
  fileName: string;
  sizeBytes: number;
  docType: DocumentTypeId;
  pageCount: number;
  outcome: RunOutcome;
  existingDocumentLabel?: string;
}

function detailFor(stage: PipelineStageId, input: PlanInput): string {
  const meta = documentTypeMeta(input.docType);
  const mb = (input.sizeBytes / 1_048_576).toFixed(2);

  switch (stage) {
    case "intake":
      return `application/pdf accepted · ${mb} MB · under the 25 MB cap · SHA-256 computed`;
    case "dedupe":
      return input.outcome === "duplicate"
        ? `Content hash already present on this property${
            input.existingDocumentLabel ? ` as ${input.existingDocumentLabel}` : ""
          }`
        : "No hash match on this property · queued for processing";
    case "virus_scan":
      return "Clean · 0 signatures matched";
    case "store_original":
      return `Original written to object storage · version 1 · immutable`;
    case "ocr":
      return input.outcome === "needs_review"
        ? `${input.pageCount} pages read · mean word confidence 0.71 · low-contrast scan detected`
        : `${input.pageCount} pages read · mean word confidence 0.96`;
    case "layout":
      return input.docType === "encumbrance_certificate"
        ? "1 entry table and 6 key-value regions detected"
        : `${input.pageCount * 4} key-value regions and ${Math.max(1, input.pageCount - 1)} table region(s) detected`;
    case "classify":
      return input.outcome === "needs_review"
        ? `${meta.label} at 0.68 confidence · below the 0.85 auto-accept threshold`
        : `${meta.label} at 0.96 confidence`;
    case "extract_entities":
      return input.outcome === "needs_review"
        ? "Fields extracted · 5 below the trust threshold · routed to review queue"
        : "Fields extracted · all above the trust threshold";
    case "extract_relationships":
      return "Party, parent-document and registering-office links extracted";
    case "canonical_map":
      return input.outcome === "needs_review"
        ? "1 person matched in the probable band · held for human confirmation, not merged"
        : "Identifiers normalised · entities resolved against existing canonical records";
    case "graph_update":
      return "Nodes and edges written with source-document attribution";
    case "compliance_eval":
      return "Checklist re-evaluated and consistency checks re-run";
    case "index":
      return "Full-text and vector indexes updated";
    default:
      return "";
  }
}

export function planRun(input: PlanInput): RunPlan {
  const steps: StageStep[] = [];

  for (const spec of PIPELINE_STAGES) {
    const step: StageStep = {
      stage: spec.id,
      durationMs: spec.durationMs,
      detail: detailFor(spec.id, input),
    };

    // A weak scan takes materially longer to OCR.
    if (spec.id === "ocr" && input.outcome === "needs_review") {
      step.durationMs = Math.round(spec.durationMs * 1.6);
    }

    // Provider timeout on the first OCR attempt, then success on retry.
    if (spec.id === "ocr" && input.outcome === "transient_failure") {
      step.failWith =
        "OCR provider returned 504 after 30s · stage will retry (attempt 2 of 3)";
    }

    steps.push(step);

    if (spec.id === "dedupe" && input.outcome === "duplicate") {
      return { steps, haltAfter: "dedupe", finalStatus: "duplicate" };
    }
  }

  return {
    steps,
    finalStatus: input.outcome === "needs_review" ? "needs_review" : "ready",
  };
}

/* ------------------------------------------------------------------- costing */

const OCR_PAISE_PER_PAGE = 130; // ~₹1.30/page, in the range of hosted OCR pricing
const LLM_PAISE_PER_1K_IN = 22;
const LLM_PAISE_PER_1K_OUT = 110;

export interface UsageEstimate {
  pagesProcessed: number;
  ocrCostPaise: number;
  llmTokensIn: number;
  llmTokensOut: number;
  llmCostPaise: number;
}

/**
 * Cost is estimated from page count, not hand-waved.
 *
 * This matters commercially: a 50-document property at 30 pages each is 1,500
 * pages, and the verification package has to price above that. Tracking it from
 * the first line of code is the only way the number is ever trustworthy.
 */
export function estimateUsage(
  pageCount: number,
  outcome: RunOutcome,
): UsageEstimate {
  if (outcome === "duplicate") {
    return {
      pagesProcessed: 0,
      ocrCostPaise: 0,
      llmTokensIn: 0,
      llmTokensOut: 0,
      llmCostPaise: 0,
    };
  }

  // ~1,100 tokens of page text per page, plus a fixed prompt overhead.
  const tokensIn = pageCount * 1_100 + 1_800;
  const tokensOut = pageCount * 240 + 400;
  const retryMultiplier = outcome === "transient_failure" ? 2 : 1;

  return {
    pagesProcessed: pageCount,
    ocrCostPaise: pageCount * OCR_PAISE_PER_PAGE * retryMultiplier,
    llmTokensIn: tokensIn,
    llmTokensOut: tokensOut,
    llmCostPaise: Math.round(
      (tokensIn / 1000) * LLM_PAISE_PER_1K_IN +
        (tokensOut / 1000) * LLM_PAISE_PER_1K_OUT,
    ),
  };
}

export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees < 100) return `₹${rupees.toFixed(2)}`;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export const MODEL_LABEL = "claude-sonnet-4.5 (extraction)";
export const PROMPT_VERSION = "extract-v7";
export const SIMULATION_SPEED = 1;
