import { currentAssessmentYear, parseIndianDate, DEMO_NOW } from "./clock";
import { documentTypeMeta } from "./document-types";
import { activeDocuments, collectField, effectiveValue } from "./fields";
import {
  extentToSqFt,
  formatSqFt,
  normaliseRegistrationNumber,
  normaliseSurveyNumber,
  personNameKey,
  similarity,
  verdictFor,
} from "./normalize";
import { parseEcEntries } from "./timeline";
import type {
  Finding,
  FindingEvidence,
  Property,
  VaultDocument,
} from "./types";

/**
 * Cross-document consistency engine.
 *
 * Every check here is deterministic and reproducible. No model is called. The
 * engine's job is to state what the documents say and where they disagree; it
 * never concludes what that disagreement means legally.
 *
 * Wording discipline: findings describe observations ("the schedule in A reads
 * 118/2 while the description in B reads 118/2A"). They never say "the title is
 * defective" or "the property is clear".
 */

function evidenceFrom(
  doc: VaultDocument,
  page: number,
  snippet: string,
): FindingEvidence {
  return { documentId: doc.id, page, snippet };
}

function surveyNumberFindings(docs: VaultDocument[]): Finding[] {
  const occurrences = collectField(docs, "survey_number");
  if (occurrences.length < 2) return [];

  const groups = new Map<string, typeof occurrences>();
  for (const occ of occurrences) {
    const key = normaliseSurveyNumber(occ.value);
    const bucket = groups.get(key);
    if (bucket) bucket.push(occ);
    else groups.set(key, [occ]);
  }

  if (groups.size < 2) return [];

  const variants = [...groups.entries()]
    .map(([key, occs]) => `${key} (${occs.length} document${occs.length === 1 ? "" : "s"})`)
    .join(" vs ");

  return [
    {
      id: "finding-survey-mismatch",
      code: "SURVEY_NUMBER_MISMATCH",
      severity: "critical",
      title: "Survey number is not written the same way across documents",
      detail:
        `After normalisation the uploaded documents still describe more than one parcel identifier: ${variants}. ` +
        "A single character difference in a survey number can point at a different parcel, so this cannot be " +
        "resolved automatically. A professional needs to confirm which identifier the transaction actually concerns.",
      evidence: occurrences.map((occ) =>
        evidenceFrom(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
      ),
      owner: "professional",
    },
  ];
}

function extentFindings(docs: VaultDocument[]): Finding[] {
  const occurrences = collectField(docs, "extent")
    .map((occ) => ({ ...occ, sqft: extentToSqFt(occ.value) }))
    .filter((occ): occ is typeof occ & { sqft: number } => occ.sqft !== null);

  if (occurrences.length < 2) return [];

  const values = occurrences.map((o) => o.sqft);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === 0) return [];

  const drift = (max - min) / min;
  // 2% absorbs rounding between guntas, square feet and square metres.
  if (drift <= 0.02) return [];

  return [
    {
      id: "finding-extent-mismatch",
      code: "EXTENT_MISMATCH",
      severity: drift > 0.05 ? "critical" : "attention",
      title: "Recorded extent differs between documents",
      detail:
        `Converted to a common unit the documents record between ${formatSqFt(min)} and ${formatSqFt(max)}, ` +
        `a difference of ${(drift * 100).toFixed(1)}%. Extent stated in a deed and extent carried in the revenue ` +
        "record commonly diverge because of kharab treatment or road widening, but the reason has to be established " +
        "from the records rather than assumed.",
      evidence: occurrences.map((occ) =>
        evidenceFrom(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
      ),
      owner: "professional",
    },
  ];
}

function nameVariantFindings(docs: VaultDocument[]): Finding[] {
  // Fields that all purport to name the present owner.
  const keys = ["owner_name", "latest_owner", "purchaser_name"];
  const occurrences = keys.flatMap((key) => collectField(docs, key));
  if (occurrences.length < 2) return [];

  const byKey = new Map<string, typeof occurrences>();
  for (const occ of occurrences) {
    const key = personNameKey(occ.value);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(occ);
    else byKey.set(key, [occ]);
  }

  const distinct = [...byKey.keys()];
  if (distinct.length < 2) return [];

  const findings: Finding[] = [];
  for (let i = 0; i < distinct.length; i += 1) {
    for (let j = i + 1; j < distinct.length; j += 1) {
      const a = distinct[i];
      const b = distinct[j];
      if (a === undefined || b === undefined) continue;
      const verdict = verdictFor(similarity(a, b));
      if (verdict !== "review") continue;

      const left = byKey.get(a) ?? [];
      const right = byKey.get(b) ?? [];
      const sampleLeft = left[0];
      const sampleRight = right[0];
      if (!sampleLeft || !sampleRight) continue;

      findings.push({
        id: `finding-name-variant-${i}-${j}`,
        code: "NAME_VARIANT",
        severity: "attention",
        title: "Owner name is spelled differently across documents",
        detail:
          `"${sampleLeft.value}" appears in ${documentTypeMeta(sampleLeft.document.docType).label} ` +
          `while "${sampleRight.value}" appears in ${documentTypeMeta(sampleRight.document.docType).label}. ` +
          "These are close enough to be the same person and far enough apart that the platform will not merge them " +
          "on its own. Confirm and correct the extracted value so downstream records agree.",
        evidence: [
          evidenceFrom(
            sampleLeft.document,
            sampleLeft.field.evidence.page,
            sampleLeft.field.evidence.snippet,
          ),
          evidenceFrom(
            sampleRight.document,
            sampleRight.field.evidence.page,
            sampleRight.field.evidence.snippet,
          ),
        ],
        owner: "reviewer",
      });
    }
  }
  return findings;
}

/**
 * Chain-of-title references.
 *
 * A deed recites the instrument the seller derived title under. Whether that
 * reference is a problem depends on how well it is corroborated, and the two
 * cases are materially different:
 *
 *   Not held, and no EC entry for it  -> critical. The chain simply cannot be
 *     followed past this point from anything in this workspace.
 *
 *   Not held, but an EC entry records it -> informational. The registry index
 *     confirms the instrument exists, who executed it and who claimed under it,
 *     so the chain is evidenced even though the deed itself has not been read.
 *     Whether the physical deed is also needed is a checklist question, and
 *     MISSING_DOCUMENT already answers it independently.
 *
 * Collapsing these two into one severity was tempting and wrong: it would have
 * flagged a well-documented file as critically defective purely because a
 * twenty-year-old parent deed had not been scanned.
 */
function chainGapFindings(docs: VaultDocument[]): Finding[] {
  const cited = collectField(docs, "parent_document");
  if (cited.length === 0) return [];

  // Registration numbers the vault can show an actual document for.
  const held = new Set<string>();
  for (const doc of docs) {
    const reg = doc.fields.find((f) => f.key === "registration_number");
    if (reg) held.add(normaliseRegistrationNumber(effectiveValue(reg)));
  }

  // Registration numbers recorded in the entry table of any EC on file.
  const inRegistry = new Map<string, VaultDocument>();
  for (const doc of docs) {
    if (doc.docType !== "encumbrance_certificate") continue;
    for (const entry of parseEcEntries(doc)) {
      if (!entry.documentNumber) continue;
      inRegistry.set(normaliseRegistrationNumber(entry.documentNumber), doc);
    }
  }

  const findings: Finding[] = [];
  for (const occ of cited) {
    const match = occ.value.match(/[A-Z]{2,4}-\d-\d{4,6}\/\d{4}-\d{2}/i);
    const citedNumber = match?.[0];
    if (!citedNumber) continue;

    const key = normaliseRegistrationNumber(citedNumber);
    if (held.has(key)) continue;

    const citedDate = occ.value.match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0];
    const corroborating = inRegistry.get(key);
    const suffix = citedDate ? ` dated ${citedDate}` : "";

    if (corroborating) {
      findings.push({
        id: `finding-chain-ref-${key}`,
        code: "OWNERSHIP_CHAIN_GAP",
        severity: "info",
        title: "A referenced parent document is evidenced but not uploaded",
        detail:
          `${documentTypeMeta(occ.document.docType).label} derives title from ${citedNumber}${suffix}. ` +
          "That instrument has not been uploaded, but the Encumbrance Certificate records it along with its " +
          "executant and claimant, so the chain is evidenced by the registry index. The deed's own recitals, " +
          "schedule and any conditions in it remain unread.",
        evidence: [
          evidenceFrom(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
          evidenceFrom(corroborating, 2, `Registry entry for ${citedNumber}`),
        ],
        owner: "reviewer",
      });
      continue;
    }

    findings.push({
      id: `finding-chain-gap-${key}`,
      code: "OWNERSHIP_CHAIN_GAP",
      severity: "critical",
      title: "A document referenced in the chain of title cannot be evidenced",
      detail:
        `${documentTypeMeta(occ.document.docType).label} relies on ${citedNumber}${suffix} to explain how the ` +
        "seller acquired the property. That instrument has not been uploaded and no Encumbrance Certificate on " +
        "file records it either. From the documents held here the ownership chain cannot be followed back past " +
        "this point at all.",
      evidence: [
        evidenceFrom(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
      ],
      owner: "professional",
    });
  }
  return findings;
}

function encumbranceFindings(docs: VaultDocument[]): Finding[] {
  const occurrences = collectField(docs, "open_mortgage");
  const findings: Finding[] = [];

  for (const occ of occurrences) {
    const value = occ.value.toLowerCase();
    const isClear =
      value.startsWith("none") ||
      value.includes("no mortgage") ||
      value.includes("nil");
    if (isClear) continue;

    findings.push({
      id: `finding-encumbrance-${occ.document.id}`,
      code: "ENCUMBRANCE_RECORDED",
      severity: "critical",
      title: "A registered charge has no traced release",
      detail:
        `The Encumbrance Certificate records ${occ.value}. The certificate itself states that no release was found ` +
        "within the period searched, which means the charge is still shown against the property in the registry. " +
        "Whether it has since been discharged has to be established with the lender and by a fresh search.",
      evidence: [
        evidenceFrom(
          occ.document,
          occ.field.evidence.page,
          occ.field.evidence.snippet,
        ),
      ],
      owner: "professional",
    });
  }

  // A charge noted in the revenue record is a separate signal from the EC.
  for (const occ of collectField(docs, "revenue_charge")) {
    findings.push({
      id: `finding-revenue-charge-${occ.document.id}`,
      code: "ENCUMBRANCE_RECORDED",
      severity: "attention",
      title: "Charge noted in the revenue record",
      detail:
        `The RTC carries an entry for ${occ.value}. Revenue-record entries and registry entries are maintained ` +
        "separately, so both need to be reconciled before the charge position is understood.",
      evidence: [
        evidenceFrom(
          occ.document,
          occ.field.evidence.page,
          occ.field.evidence.snippet,
        ),
      ],
      owner: "professional",
    });
  }

  return findings;
}

function staleTaxFindings(docs: VaultDocument[]): Finding[] {
  const occurrences = collectField(docs, "assessment_year");
  if (occurrences.length === 0) return [];

  const expected = currentAssessmentYear();
  const expectedStart = Number(expected.split("-")[0] ?? 0);

  const years = occurrences
    .map((occ) => {
      const m = occ.value.match(/(\d{4})\s*-\s*(\d{2,4})/);
      return { occ, start: m ? Number(m[1]) : NaN };
    })
    .filter((x) => !Number.isNaN(x.start));

  if (years.length === 0) return [];

  const latest = years.reduce((best, cur) =>
    cur.start > best.start ? cur : best,
  );

  // One year behind is normal early in a financial year; two is not.
  if (expectedStart - latest.start < 2) return [];

  return [
    {
      id: "finding-stale-tax",
      code: "STALE_DOCUMENT",
      severity: "attention",
      title: "Most recent tax receipt is more than one assessment year old",
      detail:
        `The newest receipt on file is for ${latest.occ.value}, while the current assessment year is ${expected}. ` +
        "Unpaid municipal or land revenue dues attach to the property rather than to the person who incurred them, " +
        "so a current receipt should be obtained.",
      evidence: [
        evidenceFrom(
          latest.occ.document,
          latest.occ.field.evidence.page,
          latest.occ.field.evidence.snippet,
        ),
      ],
      owner: "reviewer",
    },
  ];
}

function lowConfidenceFindings(docs: VaultDocument[]): Finding[] {
  const weak = docs.flatMap((doc) =>
    doc.fields
      .filter((f) => f.status === "unreviewed" && f.aiConfidence < 0.85)
      .map((field) => ({ doc, field })),
  );
  if (weak.length === 0) return [];

  const worst = weak.reduce((a, b) =>
    a.field.aiConfidence <= b.field.aiConfidence ? a : b,
  );

  return [
    {
      id: "finding-low-confidence",
      code: "LOW_CONFIDENCE_EXTRACTION",
      severity: "attention",
      title: `${weak.length} extracted field${weak.length === 1 ? "" : "s"} below the trust threshold`,
      detail:
        `Extraction confidence fell under 85% on ${weak.length} field${weak.length === 1 ? "" : "s"}, the lowest ` +
        `being "${worst.field.label}" at ${Math.round(worst.field.aiConfidence * 100)}% in ` +
        `${documentTypeMeta(worst.doc.docType).label}. These values are held back from the property record until a ` +
        "reviewer confirms or corrects them.",
      evidence: weak.slice(0, 4).map(({ doc, field }) =>
        evidenceFrom(doc, field.evidence.page, field.evidence.snippet),
      ),
      owner: "reviewer",
    },
  ];
}

function duplicateFindings(allDocs: VaultDocument[]): Finding[] {
  const duplicates = allDocs.filter((d) => d.status === "duplicate");
  if (duplicates.length === 0) return [];

  return [
    {
      id: "finding-duplicates",
      code: "DUPLICATE_UPLOAD",
      severity: "info",
      title: `${duplicates.length} duplicate upload${duplicates.length === 1 ? "" : "s"} blocked`,
      detail:
        "Content hashing matched these files against documents already held on the property. The pipeline stopped " +
        "before OCR and extraction, so no processing cost was incurred and the property record was left unchanged.",
      evidence: duplicates.map((d) =>
        evidenceFrom(d, 1, `${d.fileName} — sha256 ${d.sha256.slice(0, 16)}…`),
      ),
      owner: "platform",
    },
  ];
}

function unreviewedFindings(docs: VaultDocument[]): Finding[] {
  const pending = docs.flatMap((doc) =>
    doc.fields
      .filter((f) => f.status === "unreviewed")
      .map((field) => ({ doc, field })),
  );
  if (pending.length === 0) return [];

  return [
    {
      id: "finding-unreviewed",
      code: "UNREVIEWED_FIELDS",
      severity: "info",
      title: `${pending.length} extracted field${pending.length === 1 ? "" : "s"} awaiting review`,
      detail:
        "Machine-extracted values are shown throughout the workspace but are marked unverified until a reviewer " +
        "signs them off. Reviewed values are what a shared report presents as confirmed.",
      evidence: pending.slice(0, 3).map(({ doc, field }) =>
        evidenceFrom(doc, field.evidence.page, field.evidence.snippet),
      ),
      owner: "reviewer",
    },
  ];
}

const SEVERITY_RANK = { critical: 0, attention: 1, info: 2 } as const;

/**
 * Runs every consistency check over a property's documents.
 *
 * `allDocs` includes duplicates and failures so platform-level findings can be
 * reported; substantive checks run only over active documents.
 */
export function runConsistencyChecks(
  _property: Property,
  allDocs: VaultDocument[],
): Finding[] {
  const docs = activeDocuments(allDocs).filter(
    (d) => d.status === "ready" || d.status === "needs_review",
  );

  const findings = [
    ...surveyNumberFindings(docs),
    ...extentFindings(docs),
    ...nameVariantFindings(docs),
    ...chainGapFindings(docs),
    ...encumbranceFindings(docs),
    ...staleTaxFindings(docs),
    ...lowConfidenceFindings(docs),
    ...duplicateFindings(allDocs),
    ...unreviewedFindings(docs),
  ];

  return findings.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

/** Used by the dashboard to age a property's last analysis. */
export function analysisAgeDays(iso: string): number {
  const then = parseIndianDate(iso) ?? new Date(iso);
  const ms = DEMO_NOW.getTime() - then.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}
