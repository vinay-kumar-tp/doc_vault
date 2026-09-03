import { demoContentHash } from "@/domain/normalize";
import type {
  AuditEvent,
  DemoUser,
  ExtractedField,
  PipelineStageState,
  Property,
  ShareLink,
  VaultDocument,
} from "@/domain/types";
import {
  MODEL_LABEL,
  PIPELINE_STAGES,
  PROMPT_VERSION,
  estimateUsage,
} from "@/sim/pipeline";
import { SEED_DOCUMENTS, type SeedDocument } from "./seed-documents";

export const DEMO_USERS: DemoUser[] = [
  {
    id: "user-owner",
    name: "Vinay Kumar S",
    role: "owner",
    organisation: "Personal portfolio",
    blurb:
      "Owns three properties. Can upload, review extractions, and share a workspace with a lawyer or a bank.",
  },
  {
    id: "user-lawyer",
    name: "Adv. Meera Raghavan",
    role: "lawyer",
    organisation: "Raghavan & Associates",
    blurb:
      "Reviews and corrects machine extractions, and owns the findings that require a legal determination.",
  },
  {
    id: "user-buyer",
    name: "Rohit Shetty",
    role: "buyer",
    organisation: "Prospective purchaser",
    blurb:
      "Read-only. Sees summaries, the checklist and findings, but cannot alter the property record.",
  },
];

export const DEMO_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    ref: "RV-000001",
    title: "Flat 402, Brigade Lakeview, Kadugodi",
    kind: "apartment",
    address: {
      line1: "Flat No. 402, 4th Floor, A Block, Brigade Lakeview Apartments",
      locality: "Kadugodi, Whitefield",
      city: "Bengaluru",
      district: "Bangalore Urban",
      state: "Karnataka",
      pincode: "560067",
    },
    parcel: {
      surveyNumber: "42/3",
      khataNumber: "82-45-1204/402",
      pid: "82-45-1204",
      sasApplicationNumber: "4302011455",
      village: "Kadugodi",
      hobli: "Varthur",
      taluk: "Bangalore East",
    },
    statedExtent: "1,485 sq ft super built-up",
    createdAt: "2026-08-14T09:04:00.000Z",
    createdBy: "Vinay Kumar S",
    seeded: true,
  },
  {
    id: "prop-2",
    ref: "RV-000002",
    title: "Agricultural land, Sy. No. 118/2, Chikkajala",
    kind: "agricultural_land",
    address: {
      line1: "Survey No. 118/2, Chikkajala Village",
      locality: "Jala Hobli",
      city: "Devanahalli",
      district: "Bangalore Rural",
      state: "Karnataka",
      pincode: "562157",
    },
    parcel: {
      surveyNumber: "118/2",
      hissaNumber: "2",
      village: "Chikkajala",
      hobli: "Jala",
      taluk: "Bangalore North",
    },
    statedExtent: "2 acres 15 guntas",
    createdAt: "2026-08-20T06:32:00.000Z",
    createdBy: "Adv. Meera Raghavan",
    seeded: true,
  },
  {
    id: "prop-3",
    ref: "RV-000003",
    title: "Site 17, Greenfield Meadows, Sarjapur",
    kind: "plot",
    address: {
      line1: "Site No. 17, Greenfield Meadows Layout",
      locality: "Kachamaranahalli, Sarjapur",
      city: "Bengaluru",
      district: "Bangalore Urban",
      state: "Karnataka",
      pincode: "562125",
    },
    parcel: {
      surveyNumber: "67/4",
      khataNumber: "67-4-017",
      pid: "AK-SJP-67-4-017",
      village: "Kachamaranahalli",
      hobli: "Sarjapur",
      taluk: "Anekal",
    },
    statedExtent: "2,400 sq ft",
    createdAt: "2026-08-28T10:58:00.000Z",
    createdBy: "Priya Nair",
    seeded: true,
  },
];

/** Seeded documents have already run the pipeline, so every stage reads done. */
function completedStages(uploadedAt: string): PipelineStageState[] {
  let cursor = new Date(uploadedAt).getTime();
  return PIPELINE_STAGES.map((spec) => {
    const startedAt = new Date(cursor).toISOString();
    cursor += spec.durationMs;
    return {
      id: spec.id,
      label: spec.label,
      status: "done" as const,
      attempts: 1,
      startedAt,
      finishedAt: new Date(cursor).toISOString(),
      detail: undefined,
      deterministic: spec.deterministic,
    };
  });
}

function toFields(seed: SeedDocument): ExtractedField[] {
  const approved = new Set(seed.approvedFieldKeys ?? []);
  return seed.fields.map((field) => {
    const isApproved = approved.has(field.key);
    return {
      key: field.key,
      label: field.label,
      aiValue: field.aiValue,
      aiConfidence: field.aiConfidence,
      status: isApproved ? "approved" : "unreviewed",
      reviewedBy: isApproved ? "Adv. Meera Raghavan" : undefined,
      reviewedAt: isApproved ? "2026-08-30T05:20:00.000Z" : undefined,
      evidence: { page: field.page, snippet: field.snippet },
    };
  });
}

function toVaultDocument(seed: SeedDocument): VaultDocument {
  const usage = estimateUsage(seed.pages.length, "clean");
  return {
    id: seed.id,
    propertyId: seed.propertyId,
    fileName: seed.fileName,
    mimeType: "application/pdf",
    sizeBytes: seed.sizeBytes,
    sha256: demoContentHash(`${seed.fileName}:${seed.sizeBytes}`),
    uploadedAt: seed.uploadedAt,
    uploadedBy: seed.uploadedBy,
    version: 1,
    docType: seed.docType,
    docTypeConfidence: seed.docTypeConfidence,
    pageCount: seed.pages.length,
    pages: seed.pages,
    fields: toFields(seed),
    status: "ready",
    stages: completedStages(seed.uploadedAt),
    usage: {
      ...usage,
      model: MODEL_LABEL,
      promptVersion: PROMPT_VERSION,
    },
  };
}

export const DEMO_DOCUMENTS: VaultDocument[] = SEED_DOCUMENTS.map(
  toVaultDocument,
);

export const DEMO_SHARE_LINKS: ShareLink[] = [
  {
    id: "share-1",
    token: "rv1-lwyr-8f2a41",
    propertyId: "prop-1",
    audience: "Adv. Meera Raghavan (Raghavan & Associates)",
    scopes: [
      "documents:read",
      "summary:read",
      "compliance:read",
      "timeline:read",
      "graph:read",
    ],
    createdAt: "2026-08-30T04:50:00.000Z",
    createdBy: "Vinay Kumar S",
    expiresAt: "2026-09-13T04:50:00.000Z",
    views: [
      { at: "2026-08-30T05:12:00.000Z", viewer: "Adv. Meera Raghavan" },
      { at: "2026-09-01T11:38:00.000Z", viewer: "Adv. Meera Raghavan" },
    ],
  },
  {
    id: "share-2",
    token: "rv1-bank-22c907",
    propertyId: "prop-1",
    audience: "HDFC Bank — Whitefield branch (loan against property)",
    scopes: ["summary:read", "compliance:read"],
    createdAt: "2026-08-25T09:00:00.000Z",
    createdBy: "Vinay Kumar S",
    expiresAt: "2026-08-28T09:00:00.000Z",
    revokedAt: "2026-08-27T15:22:00.000Z",
    views: [{ at: "2026-08-26T06:41:00.000Z", viewer: "Anonymous link holder" }],
  },
];

export const DEMO_AUDIT: AuditEvent[] = [
  {
    id: "audit-1",
    at: "2026-08-14T09:04:00.000Z",
    actor: "Vinay Kumar S",
    action: "property.created",
    target: "RV-000001",
    meta: "Apartment · Kadugodi, Whitefield",
  },
  {
    id: "audit-2",
    at: "2026-08-14T09:12:00.000Z",
    actor: "Vinay Kumar S",
    action: "document.uploaded",
    target: "Sale_Deed_Flat402_Brigade_Lakeview_2019.pdf",
    meta: "4.59 MB · pipeline run started",
  },
  {
    id: "audit-3",
    at: "2026-08-20T06:32:00.000Z",
    actor: "Adv. Meera Raghavan",
    action: "property.created",
    target: "RV-000002",
    meta: "Agricultural land · Chikkajala",
  },
  {
    id: "audit-4",
    at: "2026-08-25T09:00:00.000Z",
    actor: "Vinay Kumar S",
    action: "share.created",
    target: "RV-000001",
    meta: "HDFC Bank · summary + compliance · 72h expiry",
  },
  {
    id: "audit-5",
    at: "2026-08-27T15:22:00.000Z",
    actor: "Vinay Kumar S",
    action: "share.revoked",
    target: "rv1-bank-22c907",
    meta: "Revoked 34h before scheduled expiry",
  },
  {
    id: "audit-6",
    at: "2026-08-30T05:20:00.000Z",
    actor: "Adv. Meera Raghavan",
    action: "field.approved",
    target: "RV-000001 · 14 fields",
    meta: "Reviewed extraction on sale deed, EC, khata and tax receipt",
  },
  {
    id: "audit-7",
    at: "2026-09-01T11:38:00.000Z",
    actor: "Adv. Meera Raghavan",
    action: "share.viewed",
    target: "rv1-lwyr-8f2a41",
    meta: "Second view · IP recorded",
  },
];

export const NEXT_PROPERTY_SEQUENCE = 4;
