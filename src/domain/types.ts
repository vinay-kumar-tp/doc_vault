/**
 * Core domain types for Real Estate Vault.
 *
 * DESIGN RULE (do not relax): nothing in this file can express the claim that a
 * property is "legally clear". The platform surfaces observations about the
 * documents it has been given. Legal conclusions belong to a licensed
 * professional. If a type cannot represent the claim, no prompt regression and
 * no UI copy change can accidentally make it.
 */

export const LEGAL_DISCLAIMER =
  "Findings describe only the documents currently uploaded to this workspace. " +
  "They are not a title opinion, not legal advice, and not a guarantee of " +
  "marketability. A qualified property lawyer must make the final determination.";

/* ------------------------------------------------------------------ identity */

export type Role = "owner" | "lawyer" | "buyer";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  organisation: string;
  /** Short line shown on the role picker so the demo explains itself. */
  blurb: string;
}

/* ------------------------------------------------------------------ property */

export type PropertyKind =
  | "apartment"
  | "plot"
  | "agricultural_land"
  | "commercial";

export interface PropertyAddress {
  line1: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

/**
 * Parcel identifiers. In Karnataka a single property is addressed differently by
 * each authority, which is exactly why cross-document reconciliation is hard:
 * the registration department knows survey numbers, BBMP knows PID and khata,
 * the revenue department knows hobli/village.
 */
export interface ParcelIdentity {
  surveyNumber?: string;
  hissaNumber?: string;
  khataNumber?: string;
  /** BBMP Property Identification Number. */
  pid?: string;
  /** 10-digit BBMP Self Assessment Scheme base application number. */
  sasApplicationNumber?: string;
  village?: string;
  hobli?: string;
  taluk?: string;
}

export interface Property {
  id: string;
  /** Human-facing reference, e.g. RV-000001. */
  ref: string;
  title: string;
  kind: PropertyKind;
  address: PropertyAddress;
  parcel: ParcelIdentity;
  /** Extent as recorded by the owner at creation, before documents arrive. */
  statedExtent?: string;
  createdAt: string;
  createdBy: string;
  /** Seeded demo properties are pre-processed; user-created ones start empty. */
  seeded: boolean;
}

/* ------------------------------------------------------------------ documents */

export type DocumentTypeId =
  | "sale_deed"
  | "mother_deed"
  | "encumbrance_certificate"
  | "khata"
  | "rtc"
  | "tax_receipt"
  | "occupancy_certificate"
  | "building_plan"
  | "conversion_order"
  | "loan_sanction"
  | "unclassified";

export interface DocumentTypeMeta {
  id: DocumentTypeId;
  label: string;
  shortLabel: string;
  issuer: string;
  /** What this document is actually good for, in one line. */
  purpose: string;
}

export type FieldReviewStatus = "unreviewed" | "approved" | "corrected";

export interface FieldEvidence {
  page: number;
  snippet: string;
}

/**
 * A single extracted fact.
 *
 * `humanValue` always wins over `aiValue`. This is deliberate and structural: a
 * reviewer's correction must survive reprocessing when the extraction prompt is
 * later improved, so the corrected value is stored alongside the machine value
 * rather than overwriting it.
 */
export interface ExtractedField {
  key: string;
  label: string;
  aiValue: string;
  /** 0..1 */
  aiConfidence: number;
  humanValue?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  status: FieldReviewStatus;
  evidence: FieldEvidence;
}

export type StageStatus = "pending" | "running" | "done" | "failed";

export interface PipelineStageState {
  id: PipelineStageId;
  label: string;
  status: StageStatus;
  attempts: number;
  startedAt?: string;
  finishedAt?: string;
  /** One-line description of what the stage actually produced. */
  detail?: string;
  error?: string;
  deterministic: boolean;
}

export type PipelineStageId =
  | "intake"
  | "virus_scan"
  | "store_original"
  | "ocr"
  | "layout"
  | "classify"
  | "extract_entities"
  | "extract_relationships"
  | "dedupe"
  | "canonical_map"
  | "graph_update"
  | "compliance_eval"
  | "index";

export type DocumentStatus =
  | "queued"
  | "processing"
  | "needs_review"
  | "ready"
  | "failed"
  | "duplicate";

export interface DocumentPage {
  page: number;
  text: string;
}

export interface VaultDocument {
  id: string;
  propertyId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Content hash. Deterministic duplicate detection, never an LLM. */
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
  /** Set when dedupe finds this file already exists on the property. */
  duplicateOfId?: string;
  docType: DocumentTypeId;
  docTypeConfidence: number;
  pageCount: number;
  pages: DocumentPage[];
  fields: ExtractedField[];
  status: DocumentStatus;
  stages: PipelineStageState[];
  /** Cost accounting is tracked from day one, not retrofitted. */
  usage: DocumentUsage;
}

export interface DocumentUsage {
  pagesProcessed: number;
  ocrCostPaise: number;
  llmTokensIn: number;
  llmTokensOut: number;
  llmCostPaise: number;
  model: string;
  promptVersion: string;
}

/* -------------------------------------------------------------------- graph */

export type GraphNodeKind =
  | "property"
  | "person"
  | "document"
  | "survey_number"
  | "khata"
  | "office"
  | "bank"
  | "village";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sublabel?: string;
  /** Documents that assert this node exists. */
  sourceDocumentIds: string[];
}

export type GraphEdgeKind =
  | "OWNS"
  | "SOLD_TO"
  | "HAS_DOCUMENT"
  | "REFERENCES"
  | "REGISTERED_AT"
  | "LOCATED_IN"
  | "HAS_KHATA"
  | "HAS_LOAN";

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: GraphEdgeKind;
  label: string;
  sourceDocumentIds: string[];
  confidence: number;
}

export interface PropertyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ----------------------------------------------------------------- findings */

/**
 * Severity ladder mirrors the human-in-the-loop model:
 *   info      -> machine checks agree, nothing to action
 *   attention -> machine spotted something a human should look at
 *   critical  -> a professional must decide; the platform will not
 */
export type Severity = "info" | "attention" | "critical";

export type FindingCode =
  | "OWNERSHIP_CHAIN_GAP"
  | "SURVEY_NUMBER_MISMATCH"
  | "NAME_VARIANT"
  | "EXTENT_MISMATCH"
  | "MISSING_DOCUMENT"
  | "STALE_DOCUMENT"
  | "ENCUMBRANCE_RECORDED"
  | "LOW_CONFIDENCE_EXTRACTION"
  | "DUPLICATE_UPLOAD"
  | "UNREVIEWED_FIELDS";

export interface FindingEvidence {
  documentId: string;
  page: number;
  snippet: string;
}

export interface Finding {
  id: string;
  code: FindingCode;
  severity: Severity;
  title: string;
  /** Neutral description of the observation. Never a conclusion. */
  detail: string;
  evidence: FindingEvidence[];
  /** Who is expected to resolve this. */
  owner: "platform" | "reviewer" | "professional";
}

/* --------------------------------------------------------------- compliance */

export interface ComplianceRule {
  id: string;
  documentType: DocumentTypeId;
  label: string;
  required: boolean;
  /** Why a checklist demands this document. Shown in the report. */
  rationale: string;
}

export interface ComplianceRuleSet {
  id: string;
  appliesTo: PropertyKind;
  label: string;
  /** Reports snapshot this so a historical report never silently changes. */
  version: string;
  rules: ComplianceRule[];
}

export type ComplianceItemState = "present" | "missing" | "present_unreviewed";

export interface ComplianceItem {
  rule: ComplianceRule;
  state: ComplianceItemState;
  documentIds: string[];
}

export interface ComplianceReport {
  propertyId: string;
  ruleSetId: string;
  ruleSetVersion: string;
  generatedAt: string;
  items: ComplianceItem[];
  requiredTotal: number;
  requiredPresent: number;
  completenessPct: number;
  findings: Finding[];
}

/* ----------------------------------------------------------------- timeline */

export type TimelineKind =
  | "transfer"
  | "registration"
  | "encumbrance"
  | "tax"
  | "municipal"
  | "gap";

export interface TimelineEvent {
  id: string;
  /** ISO date. Gap markers use the start of the gap. */
  date: string;
  endDate?: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  documentId?: string;
  confidence?: number;
}

/* ------------------------------------------------------------------ sharing */

export type ShareScope =
  | "documents:read"
  | "summary:read"
  | "compliance:read"
  | "timeline:read"
  | "graph:read";

export interface ShareView {
  at: string;
  viewer: string;
}

export interface ShareLink {
  id: string;
  token: string;
  propertyId: string;
  audience: string;
  scopes: ShareScope[];
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  revokedAt?: string;
  views: ShareView[];
}

/* -------------------------------------------------------------------- audit */

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  meta?: string;
}

/* --------------------------------------------------------------- assistant */

export interface AssistantCitation {
  documentId: string;
  documentLabel: string;
  page: number;
  snippet: string;
}

/**
 * The response contract for the reasoning layer.
 *
 * `citations` is required and must be non-empty. An answer with no supporting
 * evidence is rejected by the validator rather than shown to the user. This is
 * the structural version of "no answer without evidence".
 */
export interface AssistantAnswer {
  id: string;
  question: string;
  answer: string;
  citations: AssistantCitation[];
  confidence: number;
  /** Which read-only query tools the planner used to build the answer. */
  toolsUsed: string[];
  relatedFindingIds: string[];
  askedAt: string;
}

export interface AssistantRejection {
  id: string;
  question: string;
  reason: string;
  askedAt: string;
}

export type AssistantTurn =
  | ({ kind: "answer" } & AssistantAnswer)
  | ({ kind: "rejected" } & AssistantRejection);
