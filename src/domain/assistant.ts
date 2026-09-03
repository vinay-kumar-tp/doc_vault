import { parseIndianDate } from "./clock";
import { documentTypeMeta } from "./document-types";
import { activeDocuments, collectField, fieldValue } from "./fields";
import {
  displayPersonName,
  extentToSqFt,
  formatSqFt,
  normaliseSurveyNumber,
  personNameKey,
  similarity,
  verdictFor,
} from "./normalize";
import { buildTimeline } from "./timeline";
import type {
  AssistantCitation,
  AssistantTurn,
  ComplianceReport,
  Property,
  VaultDocument,
} from "./types";

/**
 * The reasoning layer.
 *
 * Architecture, mirroring the plan:
 *   question -> intent detection -> planner -> read-only query tools ->
 *   evidence builder -> answer
 *
 * Two rules are enforced structurally rather than by instruction:
 *
 *  1. The reasoning layer never reaches into storage. It can only call the
 *     allowlisted tools in TOOLS below, each of which returns already-structured,
 *     already-validated data. There is no free-form query path.
 *
 *  2. An answer with an empty citation list is never returned. `finalise`
 *     converts it into a rejection instead. "No answer without evidence" is a
 *     type-level guarantee, not a prompt suggestion.
 *
 * In production the answer prose comes from an LLM given exactly this evidence
 * bundle. The tool selection, the evidence assembly and the refusal behaviour
 * stay exactly as they are here.
 */

export interface AssistantContext {
  property: Property;
  documents: VaultDocument[];
  report: ComplianceReport;
}

/** Read-only query tools the planner is permitted to call. Nothing else exists. */
export const TOOLS = [
  "property.get",
  "documents.list",
  "documents.searchText",
  "fields.collect",
  "ownership.chain",
  "compliance.report",
  "findings.list",
] as const;

export type ToolName = (typeof TOOLS)[number];

function cite(
  doc: VaultDocument,
  page: number,
  snippet: string,
): AssistantCitation {
  return {
    documentId: doc.id,
    documentLabel: documentTypeMeta(doc.docType).label,
    page,
    snippet: snippet.trim().replace(/\s+/g, " ").slice(0, 220),
  };
}

let turnCounter = 0;
function nextId(): string {
  turnCounter += 1;
  return `turn-${Date.now()}-${turnCounter}`;
}

function finalise(
  question: string,
  answer: string,
  citations: AssistantCitation[],
  toolsUsed: ToolName[],
  relatedFindingIds: string[] = [],
): AssistantTurn {
  // The structural guarantee. An unsupported answer cannot escape this function.
  if (citations.length === 0) {
    return {
      kind: "rejected",
      id: nextId(),
      question,
      reason:
        "The documents in this workspace do not contain anything that answers this. " +
        "Rather than produce an unsupported answer, the assistant has declined. " +
        "Upload the relevant document and ask again.",
      askedAt: new Date().toISOString(),
    };
  }

  const confidence =
    citations.length === 0
      ? 0
      : Math.min(
          0.99,
          0.72 + Math.min(citations.length, 4) * 0.06,
        );

  return {
    kind: "answer",
    id: nextId(),
    question,
    answer,
    citations,
    confidence,
    toolsUsed: [...toolsUsed],
    relatedFindingIds,
    askedAt: new Date().toISOString(),
  };
}

function reject(question: string, reason: string): AssistantTurn {
  return {
    kind: "rejected",
    id: nextId(),
    question,
    reason,
    askedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------ intent routing */

type Intent =
  | "owner"
  | "encumbrance"
  | "missing"
  | "extent"
  | "survey"
  | "tax"
  | "chain"
  | "findings"
  | "khata"
  | "registration"
  | "legal_conclusion"
  | "freetext";

const INTENT_PATTERNS: [Intent, RegExp][] = [
  // Checked first: questions that ask the platform to reach a legal conclusion.
  [
    "legal_conclusion",
    /\b(should i buy|is it safe|safe to buy|is the title clear|clear title|legally clear|good to go|can i buy|is this property clear|guarantee|will i get a loan)\b/i,
  ],
  // Checked before "owner": "chain of ownership" and "ownership history" are
  // questions about the sequence of transfers, not about who holds it today.
  [
    "chain",
    /\b(chain|history|timeline|sequence|previous owner|earlier owner|past owner|prior owner|transfer|walk me through)\b/i,
  ],
  ["owner", /\b(who owns|owner|ownership|khatedar|whose name|title holder)\b/i],
  [
    "encumbrance",
    /\b(encumbrance|mortgage|charge|loan|lien|ec\b|bank|unreleased|release)\b/i,
  ],
  ["missing", /\b(missing|what.*not uploaded|incomplete|pending document|need to)\b/i],
  ["extent", /\b(extent|area|size|square feet|sq ?ft|guntas?|acres?|measure)\b/i],
  ["survey", /\b(survey|sy\.? ?no|hissa|parcel|khata number|pid)\b/i],
  ["tax", /\b(tax|receipt|dues|arrears|paid)\b/i],
  ["findings", /\b(risk|issue|problem|finding|concern|wrong|discrepanc|mismatch)\b/i],
  ["khata", /\b(khata|e-?khata|a-?khata|b-?khata|municipal)\b/i],
  ["registration", /\b(registration|registered|document number|sub-?registrar|sro)\b/i],
];

function detectIntent(question: string): Intent {
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(question)) return intent;
  }
  return "freetext";
}

/* ---------------------------------------------------------------- handlers */

/**
 * Who holds the property now.
 *
 * Source precedence matters here. `owner_name` comes from the municipal or
 * revenue record and `latest_owner` from the most recent EC claimant — both
 * describe the present holder. `purchaser_name` appears on every deed in the
 * chain, so treating it as an owner field would list the seller's grandfather as
 * a current owner. It is only used when nothing better exists, and then only
 * from the most recently registered deed.
 */
function answerOwner(q: string, ctx: AssistantContext): AssistantTurn {
  const docs = activeDocuments(ctx.documents);

  let occurrences = [
    ...collectField(docs, "owner_name"),
    ...collectField(docs, "latest_owner"),
  ];
  let sourceNote =
    "Taken from the municipal or revenue record and the most recent Encumbrance Certificate entry.";

  if (occurrences.length === 0) {
    const deeds = collectField(docs, "purchaser_name")
      .map((occ) => ({
        occ,
        when: parseIndianDate(
          fieldValue(occ.document, "registration_date") ?? "",
        ),
      }))
      .filter((x) => x.when !== null)
      .sort((a, b) => (b.when as Date).getTime() - (a.when as Date).getTime());

    const latest = deeds[0];
    if (!latest) {
      return reject(
        q,
        "No document in this workspace names an owner. A khata extract, an RTC or an Encumbrance Certificate would establish the present holder.",
      );
    }
    occurrences = [latest.occ];
    sourceNote =
      "No municipal or revenue record has been uploaded, so this is the purchaser named on the most recently registered deed rather than a confirmed record of the present assessee.";
  }

  const citations = occurrences.map((occ) =>
    cite(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
  );

  // Group by canonical key so three spellings of one person count as one person.
  const people = new Map<string, { spellings: Set<string>; reviewed: number; total: number }>();
  for (const occ of occurrences) {
    for (const name of occ.value.split(/;|\band\b/i)) {
      const trimmed = name.trim();
      if (trimmed.length < 3) continue;
      const key = personNameKey(trimmed);
      const entry = people.get(key) ?? {
        spellings: new Set<string>(),
        reviewed: 0,
        total: 0,
      };
      entry.spellings.add(displayPersonName(trimmed));
      entry.total += 1;
      if (occ.field.status !== "unreviewed") entry.reviewed += 1;
      people.set(key, entry);
    }
  }

  const nameFinding = ctx.report.findings.find((f) => f.code === "NAME_VARIANT");
  const lines: string[] = [];

  /**
   * Two renderings that differ only in letter case are the same spelling, not a
   * variant. Reporting "PRIYA NAIR" and "Priya Nair" as two ways of writing a
   * name is noise; reporting "Vinay Kumar S." and "S VINAY KUMAR" is signal.
   */
  function distinctSpellings(spellings: Set<string>): string[] {
    const byFold = new Map<string, string>();
    for (const spelling of spellings) {
      const fold = spelling.toUpperCase().replace(/\s+/g, " ").trim();
      const existing = byFold.get(fold);
      // Prefer a mixed-case rendering; all-caps comes from OCR of a form field.
      const preferable =
        existing === undefined || (existing === existing.toUpperCase() && spelling !== spelling.toUpperCase());
      if (preferable) byFold.set(fold, spelling);
    }
    return [...byFold.values()];
  }

  const entries = [...people.values()];
  if (entries.length === 1) {
    const only = entries[0];
    if (only) {
      const spellings = distinctSpellings(only.spellings);
      const primary = spellings.reduce((a, b) => (b.length > a.length ? b : a));
      lines.push(
        spellings.length === 1
          ? `${primary} is named as the present owner.`
          : `${primary} is named as the present owner, written ${spellings.length} ways across the documents (${spellings.map((s) => `"${s}"`).join(", ")}). These resolve to one person after normalisation.`,
      );
    }
  } else {
    const labels = entries.map((e) =>
      distinctSpellings(e.spellings).reduce((a, b) => (b.length > a.length ? b : a)),
    );
    const keys = [...people.keys()];

    // More than one canonical key does not necessarily mean more than one person.
    // If every pair sits in the "review" band they are probably one human written
    // inconsistently, and saying "two people own this" would be plainly wrong.
    let allPairsClose = true;
    for (let i = 0; i < keys.length && allPairsClose; i += 1) {
      for (let j = i + 1; j < keys.length; j += 1) {
        const a = keys[i];
        const b = keys[j];
        if (a === undefined || b === undefined) continue;
        if (verdictFor(similarity(a, b)) !== "review") {
          allPairsClose = false;
          break;
        }
      }
    }

    lines.push(
      allPairsClose
        ? `The present owner is named ${entries.length} ways that did not resolve to a single identity: ${labels
            .map((l) => `"${l}"`)
            .join(", ")}. These are close enough to be one person, so the platform has flagged them rather than merging them.`
        : `${entries.length} people are named as present owners: ${labels.join(", ")}.`,
    );
  }

  lines.push(sourceNote);

  const reviewed = occurrences.filter((o) => o.field.status !== "unreviewed").length;
  lines.push(
    `${reviewed} of ${occurrences.length} owner-name extraction${occurrences.length === 1 ? " has" : "s have"} been signed off by a reviewer.`,
  );

  if (nameFinding) {
    lines.push(
      "One pair of spellings was close enough to be the same person and far enough apart that the platform declined to merge them — see the name variant finding.",
    );
  }

  return finalise(
    q,
    lines.join(" "),
    citations,
    ["documents.list", "fields.collect", "findings.list"],
    nameFinding ? [nameFinding.id] : [],
  );
}

function answerEncumbrance(q: string, ctx: AssistantContext): AssistantTurn {
  const docs = activeDocuments(ctx.documents);
  const ecDocs = docs.filter((d) => d.docType === "encumbrance_certificate");
  if (ecDocs.length === 0) {
    return reject(
      q,
      "No Encumbrance Certificate has been uploaded, so the registry position on charges cannot be described from the documents held here.",
    );
  }

  const citations: AssistantCitation[] = [];
  const lines: string[] = [];

  for (const doc of ecDocs) {
    const form = fieldValue(doc, "form_type") ?? "form not read";
    const period = fieldValue(doc, "period_searched") ?? "period not read";
    const open = fieldValue(doc, "open_mortgage") ?? "not determined";
    const openField = doc.fields.find((f) => f.key === "open_mortgage");

    lines.push(
      `${form} covering ${period}: ${open}.`,
    );
    if (openField) {
      citations.push(cite(doc, openField.evidence.page, openField.evidence.snippet));
    }
    const periodField = doc.fields.find((f) => f.key === "period_searched");
    if (periodField) {
      citations.push(
        cite(doc, periodField.evidence.page, periodField.evidence.snippet),
      );
    }
  }

  const revenue = collectField(docs, "revenue_charge");
  for (const occ of revenue) {
    lines.push(
      `The revenue record separately notes ${occ.value}.`,
    );
    citations.push(
      cite(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
    );
  }

  const related = ctx.report.findings
    .filter((f) => f.code === "ENCUMBRANCE_RECORDED")
    .map((f) => f.id);

  lines.push(
    "An EC only reports what was registered at that office for the period searched. Anything outside the period, or unregistered, will not appear.",
  );

  return finalise(
    q,
    lines.join(" "),
    citations,
    ["documents.list", "fields.collect", "findings.list"],
    related,
  );
}

function answerMissing(q: string, ctx: AssistantContext): AssistantTurn {
  const missing = ctx.report.items.filter(
    (i) => i.state === "missing" && i.rule.required,
  );
  const optional = ctx.report.items.filter(
    (i) => i.state === "missing" && !i.rule.required,
  );

  // Present documents supply the citations: the answer is grounded in what the
  // vault actually holds, not only in the absence of things.
  const present = ctx.report.items.filter((i) => i.state !== "missing");
  const citations: AssistantCitation[] = [];
  for (const item of present.slice(0, 4)) {
    const docId = item.documentIds[0];
    const doc = ctx.documents.find((d) => d.id === docId);
    const field = doc?.fields[0];
    if (doc && field) {
      citations.push(cite(doc, field.evidence.page, field.evidence.snippet));
    }
  }

  const lines: string[] = [];
  lines.push(
    `Checklist "${ctx.report.ruleSetId}" version ${ctx.report.ruleSetVersion} requires ${ctx.report.requiredTotal} documents; ${ctx.report.requiredPresent} are on file (${ctx.report.completenessPct}%).`,
  );
  if (missing.length === 0) {
    lines.push("Nothing required is outstanding.");
  } else {
    lines.push(
      `Still required: ${missing.map((i) => i.rule.label).join(", ")}.`,
    );
    const first = missing[0];
    if (first) lines.push(first.rule.rationale);
  }
  if (optional.length > 0) {
    lines.push(
      `Optional and not uploaded: ${optional.map((i) => i.rule.label).join(", ")}.`,
    );
  }

  return finalise(
    q,
    lines.join(" "),
    citations,
    ["compliance.report", "documents.list"],
    ctx.report.findings.filter((f) => f.code === "MISSING_DOCUMENT").map((f) => f.id),
  );
}

function answerExtent(q: string, ctx: AssistantContext): AssistantTurn {
  const occurrences = collectField(activeDocuments(ctx.documents), "extent");
  if (occurrences.length === 0) {
    return reject(q, "No document in this workspace records an extent.");
  }

  const citations = occurrences.map((occ) =>
    cite(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
  );

  const rows = occurrences.map((occ) => {
    const sqft = extentToSqFt(occ.value);
    return `${documentTypeMeta(occ.document.docType).shortLabel} reads ${occ.value}${
      sqft ? ` (${formatSqFt(sqft)})` : ""
    }`;
  });

  const mismatch = ctx.report.findings.find((f) => f.code === "EXTENT_MISMATCH");

  return finalise(
    q,
    `${rows.join("; ")}.${
      mismatch
        ? " These do not agree once converted to a common unit, which is raised as a finding."
        : " Converted to a common unit these agree within rounding tolerance."
    }`,
    citations,
    ["fields.collect", "findings.list"],
    mismatch ? [mismatch.id] : [],
  );
}

function answerSurvey(q: string, ctx: AssistantContext): AssistantTurn {
  const occurrences = collectField(
    activeDocuments(ctx.documents),
    "survey_number",
  );
  if (occurrences.length === 0) {
    return reject(q, "No document in this workspace records a survey number.");
  }

  const citations = occurrences.map((occ) =>
    cite(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
  );

  const groups = new Map<string, string[]>();
  for (const occ of occurrences) {
    const key = normaliseSurveyNumber(occ.value);
    const bucket = groups.get(key) ?? [];
    bucket.push(documentTypeMeta(occ.document.docType).shortLabel);
    groups.set(key, bucket);
  }

  const summary = [...groups.entries()]
    .map(([key, docs]) => `${key} in ${docs.join(", ")}`)
    .join("; ");

  const mismatch = ctx.report.findings.find(
    (f) => f.code === "SURVEY_NUMBER_MISMATCH",
  );

  return finalise(
    q,
    `After normalisation the documents give: ${summary}.${
      groups.size > 1
        ? " More than one identifier is present, which is raised as a finding requiring professional confirmation."
        : " All documents agree on a single parcel identifier."
    }`,
    citations,
    ["fields.collect", "findings.list"],
    mismatch ? [mismatch.id] : [],
  );
}

function answerTax(q: string, ctx: AssistantContext): AssistantTurn {
  const docs = activeDocuments(ctx.documents).filter(
    (d) => d.docType === "tax_receipt",
  );
  if (docs.length === 0) {
    return reject(q, "No tax receipt has been uploaded to this workspace.");
  }

  const citations: AssistantCitation[] = [];
  const lines: string[] = [];
  for (const doc of docs) {
    const year = fieldValue(doc, "assessment_year") ?? "year not read";
    const amount = fieldValue(doc, "amount_paid") ?? "amount not read";
    const date = fieldValue(doc, "payment_date") ?? "date not read";
    lines.push(`${year}: ${amount} paid on ${date}.`);
    const field =
      doc.fields.find((f) => f.key === "amount_paid") ?? doc.fields[0];
    if (field) citations.push(cite(doc, field.evidence.page, field.evidence.snippet));
  }

  const stale = ctx.report.findings.find((f) => f.code === "STALE_DOCUMENT");
  if (stale) lines.push("The newest receipt is more than one assessment year old.");

  return finalise(
    q,
    lines.join(" "),
    citations,
    ["documents.list", "fields.collect"],
    stale ? [stale.id] : [],
  );
}

function answerChain(q: string, ctx: AssistantContext): AssistantTurn {
  const timeline = buildTimeline(ctx.documents, ctx.report.findings);
  const transfers = timeline.filter(
    (e) => e.kind === "transfer" && e.documentId,
  );
  if (transfers.length === 0) {
    return reject(
      q,
      "No registered transfer could be read from the documents in this workspace.",
    );
  }

  const citations: AssistantCitation[] = [];
  for (const event of transfers) {
    const doc = ctx.documents.find((d) => d.id === event.documentId);
    if (!doc) continue;
    const field =
      doc.fields.find((f) => f.key === "registration_date") ?? doc.fields[0];
    if (field) citations.push(cite(doc, field.evidence.page, field.evidence.snippet));
  }

  const gap = ctx.report.findings.find(
    (f) => f.code === "OWNERSHIP_CHAIN_GAP",
  );

  const sequence = transfers
    .map((e) => `${e.date.slice(0, 4)} · ${e.title}`)
    .join(" → ");

  return finalise(
    q,
    `${transfers.length} transfer events can be read from the documents held here: ${sequence}.${
      gap
        ? " The chain cannot be followed further back because an instrument it relies on has not been uploaded."
        : ""
    }`,
    citations,
    ["ownership.chain", "documents.list", "findings.list"],
    gap ? [gap.id] : [],
  );
}

function answerFindings(q: string, ctx: AssistantContext): AssistantTurn {
  const findings = ctx.report.findings;
  if (findings.length === 0) {
    return reject(
      q,
      "No findings have been raised, so there is nothing to summarise.",
    );
  }

  const citations: AssistantCitation[] = [];
  for (const finding of findings.slice(0, 5)) {
    for (const ev of finding.evidence.slice(0, 1)) {
      const doc = ctx.documents.find((d) => d.id === ev.documentId);
      if (doc) citations.push(cite(doc, ev.page, ev.snippet));
    }
  }

  const critical = findings.filter((f) => f.severity === "critical");
  const attention = findings.filter((f) => f.severity === "attention");

  const lines: string[] = [];
  lines.push(
    `${findings.length} findings: ${critical.length} needing a professional determination, ${attention.length} needing reviewer action.`,
  );
  for (const f of critical) lines.push(`Critical — ${f.title}.`);
  for (const f of attention.slice(0, 3)) lines.push(`Attention — ${f.title}.`);
  lines.push(
    "These describe the documents uploaded here. They are not a title opinion.",
  );

  return finalise(
    q,
    lines.join(" "),
    citations,
    ["findings.list", "compliance.report"],
    findings.map((f) => f.id),
  );
}

function answerKhata(q: string, ctx: AssistantContext): AssistantTurn {
  const docs = activeDocuments(ctx.documents).filter(
    (d) => d.docType === "khata",
  );
  if (docs.length === 0) {
    return reject(
      q,
      "No khata or e-khata extract has been uploaded to this workspace.",
    );
  }

  const citations: AssistantCitation[] = [];
  const lines: string[] = [];
  for (const doc of docs) {
    const number = fieldValue(doc, "khata_number") ?? "not read";
    const klass = fieldValue(doc, "khata_class") ?? "not read";
    const pid = fieldValue(doc, "pid");
    lines.push(
      `Khata ${number}, classified ${klass}${pid ? `, PID ${pid}` : ""}.`,
    );
    for (const key of ["khata_number", "khata_class"]) {
      const field = doc.fields.find((f) => f.key === key);
      if (field) citations.push(cite(doc, field.evidence.page, field.evidence.snippet));
    }
  }
  lines.push(
    "A khata identifies who is assessed for tax on the property. It is a municipal record and is not by itself a document of title.",
  );

  return finalise(q, lines.join(" "), citations, [
    "documents.list",
    "fields.collect",
  ]);
}

function answerRegistration(q: string, ctx: AssistantContext): AssistantTurn {
  const occurrences = collectField(
    activeDocuments(ctx.documents),
    "registration_number",
  );
  if (occurrences.length === 0) {
    return reject(
      q,
      "No registration particulars could be read from the documents in this workspace.",
    );
  }

  const citations = occurrences.map((occ) =>
    cite(occ.document, occ.field.evidence.page, occ.field.evidence.snippet),
  );

  const rows = occurrences.map((occ) => {
    const date = fieldValue(occ.document, "registration_date") ?? "date not read";
    const sro = fieldValue(occ.document, "sro");
    return `${documentTypeMeta(occ.document.docType).shortLabel} ${occ.value} registered ${date}${
      sro ? ` at ${sro}` : ""
    }`;
  });

  return finalise(q, `${rows.join("; ")}.`, citations, [
    "fields.collect",
    "documents.list",
  ]);
}

/** Full-text fallback across OCR output. Cites the pages it actually matched. */
function answerFreetext(q: string, ctx: AssistantContext): AssistantTurn {
  const terms = q
    .toLowerCase()
    .replace(/[^a-z0-9/\s.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t));

  if (terms.length === 0) {
    return reject(
      q,
      "The question was too general to map onto anything in this workspace. Try naming a document, a person, a survey number or a date.",
    );
  }

  const citations: AssistantCitation[] = [];
  const matchedTerms = new Set<string>();

  for (const doc of activeDocuments(ctx.documents)) {
    for (const page of doc.pages) {
      const haystack = page.text.toLowerCase();
      const hits = terms.filter((t) => haystack.includes(t));
      if (hits.length === 0) continue;
      hits.forEach((h) => matchedTerms.add(h));

      const firstHit = hits[0];
      if (!firstHit) continue;
      const at = haystack.indexOf(firstHit);
      const snippet = page.text.slice(
        Math.max(0, at - 90),
        Math.min(page.text.length, at + 150),
      );
      citations.push(cite(doc, page.page, snippet));
      if (citations.length >= 6) break;
    }
    if (citations.length >= 6) break;
  }

  return finalise(
    q,
    `Searched the full text of every document on this property for ${terms
      .map((t) => `"${t}"`)
      .join(", ")} and matched ${citations.length} passage${
      citations.length === 1 ? "" : "s"
    } on ${matchedTerms.size} of those terms. The relevant extracts are cited below; read them in context before relying on them.`,
    citations,
    ["documents.searchText"],
  );
}

const STOPWORDS = new Set([
  "what",
  "when",
  "where",
  "which",
  "this",
  "that",
  "there",
  "have",
  "does",
  "about",
  "with",
  "from",
  "property",
  "document",
  "documents",
  "tell",
  "show",
  "please",
  "would",
  "could",
  "should",
]);

/* ------------------------------------------------------------------- entry */

export function ask(question: string, ctx: AssistantContext): AssistantTurn {
  const trimmed = question.trim();
  if (trimmed.length === 0) {
    return reject(question, "Empty question.");
  }

  const intent = detectIntent(trimmed);

  if (intent === "legal_conclusion") {
    const counts = {
      critical: ctx.report.findings.filter((f) => f.severity === "critical").length,
      attention: ctx.report.findings.filter((f) => f.severity === "attention")
        .length,
    };
    return reject(
      trimmed,
      "This platform does not answer whether a property is safe to buy or whether title is clear. " +
        "That is a legal determination and it belongs to a qualified property lawyer. " +
        `What it can tell you: documentation is ${ctx.report.completenessPct}% complete against the applicable checklist, ` +
        `with ${counts.critical} finding${counts.critical === 1 ? "" : "s"} requiring a professional determination and ` +
        `${counts.attention} requiring reviewer action. Ask about any of those specifically, or share this workspace with your lawyer.`,
    );
  }

  switch (intent) {
    case "owner":
      return answerOwner(trimmed, ctx);
    case "encumbrance":
      return answerEncumbrance(trimmed, ctx);
    case "missing":
      return answerMissing(trimmed, ctx);
    case "extent":
      return answerExtent(trimmed, ctx);
    case "survey":
      return answerSurvey(trimmed, ctx);
    case "tax":
      return answerTax(trimmed, ctx);
    case "chain":
      return answerChain(trimmed, ctx);
    case "findings":
      return answerFindings(trimmed, ctx);
    case "khata":
      return answerKhata(trimmed, ctx);
    case "registration":
      return answerRegistration(trimmed, ctx);
    default:
      return answerFreetext(trimmed, ctx);
  }
}

export const SUGGESTED_QUESTIONS = [
  "Who owns this property according to the documents?",
  "Are there any unreleased charges or mortgages?",
  "What documents are still missing?",
  "Does the extent agree across all documents?",
  "Walk me through the chain of ownership.",
  "Summarise the findings on this property.",
  "Is the title clear and safe to buy?",
];
