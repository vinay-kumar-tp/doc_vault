"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import { ask, type AssistantContext } from "@/domain/assistant";
import { evaluateCompliance } from "@/domain/compliance";
import { buildPropertyGraph } from "@/domain/graph";
import { demoContentHash } from "@/domain/normalize";
import { buildTimeline } from "@/domain/timeline";
import type {
  AssistantTurn,
  AuditEvent,
  ComplianceReport,
  DemoUser,
  ExtractedField,
  PipelineStageId,
  Property,
  PropertyGraph,
  PropertyKind,
  ShareLink,
  ShareScope,
  TimelineEvent,
  VaultDocument,
} from "@/domain/types";
import {
  DEMO_AUDIT,
  DEMO_DOCUMENTS,
  DEMO_PROPERTIES,
  DEMO_SHARE_LINKS,
  DEMO_USERS,
  NEXT_PROPERTY_SEQUENCE,
} from "@/demo/seed";
import {
  UPLOADABLE_SAMPLES,
  type UploadableSample,
} from "@/demo/seed-documents";
import { UPLOAD_PAYLOADS } from "@/demo/upload-payloads";
import {
  MODEL_LABEL,
  PROMPT_VERSION,
  createInitialStages,
  estimateUsage,
  planRun,
  stageSpec,
  type RunOutcome,
  type RunPlan,
} from "@/sim/pipeline";

/* ------------------------------------------------------------------- state */

interface RunRecord {
  outcome: RunOutcome;
  sampleId: string;
}

interface State {
  hydrated: boolean;
  currentUserId: string | null;
  properties: Property[];
  documents: VaultDocument[];
  runs: Record<string, RunRecord>;
  shareLinks: ShareLink[];
  audit: AuditEvent[];
  assistant: Record<string, AssistantTurn[]>;
  sequence: number;
}

const INITIAL_STATE: State = {
  hydrated: false,
  currentUserId: null,
  properties: DEMO_PROPERTIES,
  documents: DEMO_DOCUMENTS,
  runs: {},
  shareLinks: DEMO_SHARE_LINKS,
  audit: DEMO_AUDIT,
  assistant: {},
  sequence: NEXT_PROPERTY_SEQUENCE,
};

type PersistedState = Omit<State, "hydrated">;

type Action =
  | { type: "HYDRATE"; state: PersistedState }
  | { type: "MARK_HYDRATED" }
  | { type: "SIGN_IN"; userId: string }
  | { type: "SIGN_OUT" }
  | { type: "CREATE_PROPERTY"; property: Property }
  | { type: "ADD_DOCUMENT"; document: VaultDocument; run: RunRecord }
  | { type: "STAGE_START"; docId: string; stageId: PipelineStageId; at: string }
  | {
      type: "STAGE_DONE";
      docId: string;
      stageId: PipelineStageId;
      detail: string;
      at: string;
    }
  | {
      type: "STAGE_FAIL";
      docId: string;
      stageId: PipelineStageId;
      error: string;
      at: string;
    }
  | {
      type: "DOC_EXTRACTED";
      docId: string;
      pages: { page: number; text: string }[];
      fields: ExtractedField[];
    }
  | {
      type: "DOC_FINALISE";
      docId: string;
      status: VaultDocument["status"];
      duplicateOfId?: string;
    }
  | {
      type: "REVIEW_FIELD";
      docId: string;
      key: string;
      correction: string | null;
      reviewer: string;
      at: string;
    }
  | { type: "REOPEN_FIELD"; docId: string; key: string }
  | { type: "CREATE_SHARE"; share: ShareLink }
  | { type: "REVOKE_SHARE"; id: string; at: string }
  | { type: "RECORD_VIEW"; token: string; viewer: string; at: string }
  | { type: "ASSISTANT_TURN"; propertyId: string; turn: AssistantTurn }
  | { type: "CLEAR_ASSISTANT"; propertyId: string }
  | { type: "AUDIT"; event: AuditEvent }
  | { type: "RESET" };

function mapDoc(
  state: State,
  docId: string,
  fn: (doc: VaultDocument) => VaultDocument,
): State {
  return {
    ...state,
    documents: state.documents.map((d) => (d.id === docId ? fn(d) : d)),
  };
}

function mapStage(
  doc: VaultDocument,
  stageId: PipelineStageId,
  fn: (stage: VaultDocument["stages"][number]) => VaultDocument["stages"][number],
): VaultDocument {
  return {
    ...doc,
    stages: doc.stages.map((s) => (s.id === stageId ? fn(s) : s)),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...action.state, hydrated: true };

    case "MARK_HYDRATED":
      return { ...state, hydrated: true };

    case "SIGN_IN":
      return { ...state, currentUserId: action.userId };

    case "SIGN_OUT":
      return { ...state, currentUserId: null };

    case "CREATE_PROPERTY":
      return {
        ...state,
        properties: [action.property, ...state.properties],
        sequence: state.sequence + 1,
      };

    case "ADD_DOCUMENT":
      return {
        ...state,
        documents: [...state.documents, action.document],
        runs: { ...state.runs, [action.document.id]: action.run },
      };

    case "STAGE_START":
      return mapDoc(state, action.docId, (doc) => ({
        ...mapStage(doc, action.stageId, (stage) => ({
          ...stage,
          status: "running",
          attempts: stage.attempts + 1,
          startedAt: action.at,
          error: undefined,
        })),
        status: "processing",
      }));

    case "STAGE_DONE":
      return mapDoc(state, action.docId, (doc) =>
        mapStage(doc, action.stageId, (stage) => ({
          ...stage,
          status: "done",
          finishedAt: action.at,
          detail: action.detail,
          error: undefined,
        })),
      );

    case "STAGE_FAIL":
      return mapDoc(state, action.docId, (doc) =>
        mapStage(doc, action.stageId, (stage) => ({
          ...stage,
          status: "failed",
          finishedAt: action.at,
          error: action.error,
        })),
      );

    case "DOC_EXTRACTED":
      return mapDoc(state, action.docId, (doc) => ({
        ...doc,
        pages: action.pages,
        pageCount: action.pages.length,
        fields: action.fields,
      }));

    case "DOC_FINALISE":
      return mapDoc(state, action.docId, (doc) => ({
        ...doc,
        status: action.status,
        duplicateOfId: action.duplicateOfId ?? doc.duplicateOfId,
      }));

    case "REVIEW_FIELD":
      return mapDoc(state, action.docId, (doc) => ({
        ...doc,
        fields: doc.fields.map((f) =>
          f.key === action.key
            ? {
                ...f,
                // The AI value is never overwritten. A correction is stored
                // beside it so reprocessing cannot silently undo the reviewer.
                humanValue:
                  action.correction === null ? undefined : action.correction,
                status: action.correction === null ? "approved" : "corrected",
                reviewedBy: action.reviewer,
                reviewedAt: action.at,
              }
            : f,
        ),
      }));

    case "REOPEN_FIELD":
      return mapDoc(state, action.docId, (doc) => ({
        ...doc,
        fields: doc.fields.map((f) =>
          f.key === action.key
            ? {
                ...f,
                humanValue: undefined,
                status: "unreviewed",
                reviewedBy: undefined,
                reviewedAt: undefined,
              }
            : f,
        ),
      }));

    case "CREATE_SHARE":
      return { ...state, shareLinks: [action.share, ...state.shareLinks] };

    case "REVOKE_SHARE":
      return {
        ...state,
        shareLinks: state.shareLinks.map((s) =>
          s.id === action.id ? { ...s, revokedAt: action.at } : s,
        ),
      };

    case "RECORD_VIEW":
      return {
        ...state,
        shareLinks: state.shareLinks.map((s) =>
          s.token === action.token
            ? { ...s, views: [...s.views, { at: action.at, viewer: action.viewer }] }
            : s,
        ),
      };

    case "ASSISTANT_TURN":
      return {
        ...state,
        assistant: {
          ...state.assistant,
          [action.propertyId]: [
            ...(state.assistant[action.propertyId] ?? []),
            action.turn,
          ],
        },
      };

    case "CLEAR_ASSISTANT": {
      const next = { ...state.assistant };
      delete next[action.propertyId];
      return { ...state, assistant: next };
    }

    case "AUDIT":
      return { ...state, audit: [action.event, ...state.audit] };

    case "RESET":
      return { ...INITIAL_STATE, hydrated: true };

    default:
      return state;
  }
}

/* --------------------------------------------------------------- persistence */

const STORAGE_KEY = "rev-demo-state-v1";

function persist(state: State) {
  if (typeof window === "undefined") return;
  // `hydrated` is runtime-only and must not round-trip through storage.
  const rest: PersistedState = {
    currentUserId: state.currentUserId,
    properties: state.properties,
    documents: state.documents,
    runs: state.runs,
    shareLinks: state.shareLinks,
    audit: state.audit,
    assistant: state.assistant,
    sequence: state.sequence,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // Storage full or blocked. The demo still works, it just will not survive
    // a reload, which is an acceptable degradation.
  }
}

function restore(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.properties) || !Array.isArray(parsed.documents)) {
      return null;
    }
    // Any run interrupted by a reload is marked failed at its running stage so
    // it can be resumed from exactly that stage rather than reprocessed.
    const documents = parsed.documents.map((doc) => {
      if (doc.status !== "processing" && doc.status !== "queued") return doc;
      return {
        ...doc,
        status: "failed" as const,
        stages: doc.stages.map((stage) =>
          stage.status === "running" || stage.status === "pending"
            ? stage.status === "running"
              ? {
                  ...stage,
                  status: "failed" as const,
                  error: "Interrupted by page reload · retry this stage to resume",
                }
              : stage
            : stage,
        ),
      };
    });
    return { ...parsed, documents };
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------- context */

export interface CreatePropertyInput {
  title: string;
  kind: PropertyKind;
  line1: string;
  locality: string;
  city: string;
  district: string;
  pincode: string;
  surveyNumber: string;
  khataNumber: string;
  village: string;
  hobli: string;
  statedExtent: string;
}

interface VaultContextValue {
  hydrated: boolean;
  currentUser: DemoUser | null;
  users: DemoUser[];
  properties: Property[];
  documents: VaultDocument[];
  shareLinks: ShareLink[];
  audit: AuditEvent[];
  samples: UploadableSample[];

  signIn: (userId: string) => void;
  signOut: () => void;
  resetDemo: () => void;

  createProperty: (input: CreatePropertyInput) => string;
  uploadSample: (propertyId: string, sampleId: string) => string | null;
  retryStage: (docId: string, stageId: PipelineStageId) => void;

  reviewField: (docId: string, key: string, correction: string | null) => void;
  reopenField: (docId: string, key: string) => void;

  createShare: (
    propertyId: string,
    audience: string,
    scopes: ShareScope[],
    ttlHours: number,
  ) => ShareLink;
  revokeShare: (id: string) => void;
  recordShareView: (token: string, viewer: string) => void;

  askAssistant: (propertyId: string) => (question: string) => void;
  clearAssistant: (propertyId: string) => void;
  assistantTurns: (propertyId: string) => AssistantTurn[];

  documentsFor: (propertyId: string) => VaultDocument[];
  propertyById: (id: string) => Property | undefined;
  documentById: (id: string) => VaultDocument | undefined;
  reportFor: (propertyId: string) => ComplianceReport | undefined;
  timelineFor: (propertyId: string) => TimelineEvent[];
  graphFor: (propertyId: string) => PropertyGraph;
  sharesFor: (propertyId: string) => ShareLink[];
  shareByToken: (token: string) => ShareLink | undefined;
}

const VaultContext = createContext<VaultContextValue | null>(null);

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate once on the client. Rendering the seed first and swapping after
  // mount keeps server and first client render identical.
  useEffect(() => {
    const restored = restore();
    if (restored) dispatch({ type: "HYDRATE", state: restored });
    else dispatch({ type: "MARK_HYDRATED" });
  }, []);

  useEffect(() => {
    if (state.hydrated) persist(state);
  }, [state]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
  }, []);

  const addAudit = useCallback(
    (actor: string, action: string, target: string, meta?: string) => {
      dispatch({
        type: "AUDIT",
        event: { id: uid("audit"), at: new Date().toISOString(), actor, action, target, meta },
      });
    },
    [],
  );

  const currentUser = useMemo(
    () => DEMO_USERS.find((u) => u.id === state.currentUserId) ?? null,
    [state.currentUserId],
  );

  /* ------------------------------------------------------- pipeline runner */

  /**
   * Walks a run plan one stage at a time.
   *
   * Retry is per stage: a failed stage re-enters `runStep` at the same index
   * with an incremented attempt, so no earlier stage is redone. This is the
   * whole reason the pipeline is modelled as independent stages rather than one
   * long function.
   */
  const runFrom = useCallback(
    (
      docId: string,
      plan: RunPlan,
      startIndex: number,
      payloadId: string | undefined,
      autoRetry: boolean,
    ) => {
      const runStep = (index: number, attempt: number) => {
        const step = plan.steps[index];
        if (!step) return;

        dispatch({
          type: "STAGE_START",
          docId,
          stageId: step.stage,
          at: new Date().toISOString(),
        });

        later(() => {
          const shouldFail = Boolean(step.failWith) && attempt === 1;

          if (shouldFail) {
            dispatch({
              type: "STAGE_FAIL",
              docId,
              stageId: step.stage,
              error: step.failWith ?? "Stage failed",
              at: new Date().toISOString(),
            });
            dispatch({ type: "DOC_FINALISE", docId, status: "processing" });
            if (autoRetry) {
              // Backoff before the automatic second attempt.
              later(() => runStep(index, attempt + 1), 1600);
            }
            return;
          }

          dispatch({
            type: "STAGE_DONE",
            docId,
            stageId: step.stage,
            detail: step.detail,
            at: new Date().toISOString(),
          });

          // Extraction is where fields and page text materialise.
          if (step.stage === "extract_entities" && payloadId) {
            const payload = UPLOAD_PAYLOADS[payloadId];
            if (payload) {
              dispatch({
                type: "DOC_EXTRACTED",
                docId,
                pages: payload.pages,
                fields: payload.fields.map((f) => ({
                  key: f.key,
                  label: f.label,
                  aiValue: f.aiValue,
                  aiConfidence: f.aiConfidence,
                  status: "unreviewed" as const,
                  evidence: { page: f.page, snippet: f.snippet },
                })),
              });
            }
          }

          if (plan.haltAfter === step.stage) {
            const doc = stateRef.current.documents.find((d) => d.id === docId);
            const twin = doc
              ? stateRef.current.documents.find(
                  (d) =>
                    d.id !== doc.id &&
                    d.propertyId === doc.propertyId &&
                    d.sha256 === doc.sha256,
                )
              : undefined;
            dispatch({
              type: "DOC_FINALISE",
              docId,
              status: "duplicate",
              duplicateOfId: twin?.id,
            });
            addAudit(
              currentUser?.name ?? "System",
              "document.duplicate_blocked",
              doc?.fileName ?? docId,
              "Halted at dedupe · no OCR or LLM cost incurred",
            );
            return;
          }

          if (index === plan.steps.length - 1) {
            dispatch({ type: "DOC_FINALISE", docId, status: plan.finalStatus });
            const doc = stateRef.current.documents.find((d) => d.id === docId);
            addAudit(
              currentUser?.name ?? "System",
              "document.processed",
              doc?.fileName ?? docId,
              plan.finalStatus === "needs_review"
                ? "Completed · fields routed to review queue"
                : "Completed · all fields above trust threshold",
            );
            return;
          }

          runStep(index + 1, 1);
        }, step.durationMs);
      };

      runStep(startIndex, 1);
    },
    [addAudit, currentUser, later],
  );

  /* ---------------------------------------------------------------- actions */

  const signIn = useCallback((userId: string) => {
    dispatch({ type: "SIGN_IN", userId });
  }, []);

  const signOut = useCallback(() => {
    dispatch({ type: "SIGN_OUT" });
  }, []);

  const resetDemo = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current.clear();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({ type: "RESET" });
  }, []);

  const createProperty = useCallback(
    (input: CreatePropertyInput) => {
      const id = uid("prop");
      const ref = `RV-${String(stateRef.current.sequence).padStart(6, "0")}`;
      const actor = currentUser?.name ?? "Demo user";

      dispatch({
        type: "CREATE_PROPERTY",
        property: {
          id,
          ref,
          title: input.title,
          kind: input.kind,
          address: {
            line1: input.line1,
            locality: input.locality,
            city: input.city,
            district: input.district,
            state: "Karnataka",
            pincode: input.pincode,
          },
          parcel: {
            surveyNumber: input.surveyNumber || undefined,
            khataNumber: input.khataNumber || undefined,
            village: input.village || undefined,
            hobli: input.hobli || undefined,
          },
          statedExtent: input.statedExtent || undefined,
          createdAt: new Date().toISOString(),
          createdBy: actor,
          seeded: false,
        },
      });
      addAudit(actor, "property.created", ref, input.title);
      return id;
    },
    [addAudit, currentUser],
  );

  const uploadSample = useCallback(
    (propertyId: string, sampleId: string) => {
      const sample = UPLOADABLE_SAMPLES.find((s) => s.id === sampleId);
      if (!sample) return null;

      const payload = UPLOAD_PAYLOADS[sample.id];
      const pageCount = payload?.pages.length ?? 1;
      const docId = uid("doc");
      const actor = currentUser?.name ?? "Demo user";
      const usage = estimateUsage(pageCount, sample.outcome);

      const document: VaultDocument = {
        id: docId,
        propertyId,
        fileName: sample.fileName,
        mimeType: "application/pdf",
        sizeBytes: sample.sizeBytes,
        sha256: demoContentHash(`${sample.fileName}:${sample.sizeBytes}`),
        uploadedAt: new Date().toISOString(),
        uploadedBy: actor,
        version: 1,
        docType: sample.outcome === "duplicate" ? "unclassified" : sample.docType,
        docTypeConfidence: sample.outcome === "needs_review" ? 0.68 : 0.96,
        pageCount,
        pages: [],
        fields: [],
        status: "queued",
        stages: createInitialStages(),
        usage: { ...usage, model: MODEL_LABEL, promptVersion: PROMPT_VERSION },
      };

      const existing = stateRef.current.documents.find(
        (d) => d.propertyId === propertyId && d.sha256 === document.sha256,
      );

      const outcome: RunOutcome = existing ? "duplicate" : sample.outcome;

      dispatch({
        type: "ADD_DOCUMENT",
        document,
        run: { outcome, sampleId: sample.id },
      });
      addAudit(
        actor,
        "document.uploaded",
        sample.fileName,
        `${(sample.sizeBytes / 1_048_576).toFixed(2)} MB · pipeline run started`,
      );

      const plan = planRun({
        fileName: sample.fileName,
        sizeBytes: sample.sizeBytes,
        docType: sample.docType,
        pageCount,
        outcome,
        existingDocumentLabel: existing?.fileName,
      });

      runFrom(docId, plan, 0, sample.id, true);
      return docId;
    },
    [addAudit, currentUser, runFrom],
  );

  const retryStage = useCallback(
    (docId: string, stageId: PipelineStageId) => {
      const doc = stateRef.current.documents.find((d) => d.id === docId);
      const run = stateRef.current.runs[docId];
      if (!doc || !run) return;

      const plan = planRun({
        fileName: doc.fileName,
        sizeBytes: doc.sizeBytes,
        docType: doc.docType,
        pageCount: doc.pageCount,
        outcome: run.outcome,
      });

      const index = plan.steps.findIndex((s) => s.stage === stageId);
      if (index < 0) return;

      // A manual retry must not re-trigger the simulated failure, otherwise the
      // user can never get past it.
      const steps = plan.steps.map((step, i) =>
        i === index ? { ...step, failWith: undefined } : step,
      );

      addAudit(
        currentUser?.name ?? "Demo user",
        "pipeline.stage_retried",
        `${doc.fileName} · ${stageSpec(stageId).label}`,
      );
      runFrom(docId, { ...plan, steps }, index, run.sampleId, false);
    },
    [addAudit, currentUser, runFrom],
  );

  const reviewField = useCallback(
    (docId: string, key: string, correction: string | null) => {
      const reviewer = currentUser?.name ?? "Demo user";
      dispatch({
        type: "REVIEW_FIELD",
        docId,
        key,
        correction,
        reviewer,
        at: new Date().toISOString(),
      });
      const doc = stateRef.current.documents.find((d) => d.id === docId);
      addAudit(
        reviewer,
        correction === null ? "field.approved" : "field.corrected",
        `${doc?.fileName ?? docId} · ${key}`,
        correction === null ? undefined : `Corrected to "${correction}"`,
      );
    },
    [addAudit, currentUser],
  );

  const reopenField = useCallback((docId: string, key: string) => {
    dispatch({ type: "REOPEN_FIELD", docId, key });
  }, []);

  const createShare = useCallback(
    (
      propertyId: string,
      audience: string,
      scopes: ShareScope[],
      ttlHours: number,
    ) => {
      const actor = currentUser?.name ?? "Demo user";
      const property = stateRef.current.properties.find((p) => p.id === propertyId);
      const share: ShareLink = {
        id: uid("share"),
        token: `${(property?.ref ?? "rv").toLowerCase().replace(/[^a-z0-9]/g, "")}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        propertyId,
        audience,
        scopes,
        createdAt: new Date().toISOString(),
        createdBy: actor,
        expiresAt: new Date(Date.now() + ttlHours * 3_600_000).toISOString(),
        views: [],
      };
      dispatch({ type: "CREATE_SHARE", share });
      addAudit(
        actor,
        "share.created",
        property?.ref ?? propertyId,
        `${audience} · ${scopes.length} scope(s) · ${ttlHours}h expiry`,
      );
      return share;
    },
    [addAudit, currentUser],
  );

  const revokeShare = useCallback(
    (id: string) => {
      const share = stateRef.current.shareLinks.find((s) => s.id === id);
      dispatch({ type: "REVOKE_SHARE", id, at: new Date().toISOString() });
      addAudit(
        currentUser?.name ?? "Demo user",
        "share.revoked",
        share?.token ?? id,
        "Access withdrawn immediately",
      );
    },
    [addAudit, currentUser],
  );

  const recordShareView = useCallback(
    (token: string, viewer: string) => {
      dispatch({
        type: "RECORD_VIEW",
        token,
        viewer,
        at: new Date().toISOString(),
      });
    },
    [],
  );

  /* -------------------------------------------------------------- selectors */

  const documentsFor = useCallback(
    (propertyId: string) =>
      state.documents.filter((d) => d.propertyId === propertyId),
    [state.documents],
  );

  const propertyById = useCallback(
    (id: string) => state.properties.find((p) => p.id === id),
    [state.properties],
  );

  const documentById = useCallback(
    (id: string) => state.documents.find((d) => d.id === id),
    [state.documents],
  );

  const reportFor = useCallback(
    (propertyId: string) => {
      const property = state.properties.find((p) => p.id === propertyId);
      if (!property) return undefined;
      return evaluateCompliance(
        property,
        state.documents.filter((d) => d.propertyId === propertyId),
      );
    },
    [state.properties, state.documents],
  );

  const timelineFor = useCallback(
    (propertyId: string) => {
      const report = reportFor(propertyId);
      if (!report) return [];
      return buildTimeline(
        state.documents.filter((d) => d.propertyId === propertyId),
        report.findings,
      );
    },
    [reportFor, state.documents],
  );

  const graphFor = useCallback(
    (propertyId: string) => {
      const property = state.properties.find((p) => p.id === propertyId);
      if (!property) return { nodes: [], edges: [] };
      return buildPropertyGraph(
        property,
        state.documents.filter((d) => d.propertyId === propertyId),
      );
    },
    [state.properties, state.documents],
  );

  const sharesFor = useCallback(
    (propertyId: string) =>
      state.shareLinks.filter((s) => s.propertyId === propertyId),
    [state.shareLinks],
  );

  const shareByToken = useCallback(
    (token: string) => state.shareLinks.find((s) => s.token === token),
    [state.shareLinks],
  );

  const askAssistant = useCallback(
    (propertyId: string) => (question: string) => {
      const property = stateRef.current.properties.find((p) => p.id === propertyId);
      const report = reportFor(propertyId);
      if (!property || !report) return;

      const ctx: AssistantContext = {
        property,
        documents: stateRef.current.documents.filter(
          (d) => d.propertyId === propertyId,
        ),
        report,
      };
      dispatch({ type: "ASSISTANT_TURN", propertyId, turn: ask(question, ctx) });
    },
    [reportFor],
  );

  const clearAssistant = useCallback((propertyId: string) => {
    dispatch({ type: "CLEAR_ASSISTANT", propertyId });
  }, []);

  const assistantTurns = useCallback(
    (propertyId: string) => state.assistant[propertyId] ?? [],
    [state.assistant],
  );

  const value = useMemo<VaultContextValue>(
    () => ({
      hydrated: state.hydrated,
      currentUser,
      users: DEMO_USERS,
      properties: state.properties,
      documents: state.documents,
      shareLinks: state.shareLinks,
      audit: state.audit,
      samples: UPLOADABLE_SAMPLES,
      signIn,
      signOut,
      resetDemo,
      createProperty,
      uploadSample,
      retryStage,
      reviewField,
      reopenField,
      createShare,
      revokeShare,
      recordShareView,
      askAssistant,
      clearAssistant,
      assistantTurns,
      documentsFor,
      propertyById,
      documentById,
      reportFor,
      timelineFor,
      graphFor,
      sharesFor,
      shareByToken,
    }),
    [
      state.hydrated,
      state.properties,
      state.documents,
      state.shareLinks,
      state.audit,
      currentUser,
      signIn,
      signOut,
      resetDemo,
      createProperty,
      uploadSample,
      retryStage,
      reviewField,
      reopenField,
      createShare,
      revokeShare,
      recordShareView,
      askAssistant,
      clearAssistant,
      assistantTurns,
      documentsFor,
      propertyById,
      documentById,
      reportFor,
      timelineFor,
      graphFor,
      sharesFor,
      shareByToken,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside VaultProvider");
  return ctx;
}
