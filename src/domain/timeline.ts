import { parseIndianDate } from "./clock";
import { documentTypeMeta } from "./document-types";
import { activeDocuments, fieldValue } from "./fields";
import type { Finding, TimelineEvent, VaultDocument } from "./types";

/**
 * Timeline construction.
 *
 * Two sources feed it:
 *   1. Extracted fields on each document (registration dates, payment dates).
 *   2. The entry table inside an Encumbrance Certificate, parsed out of the OCR
 *      text. An EC is the single richest source of transaction history in an
 *      Indian property file, and its entries are the backbone of the ownership
 *      chain even when the underlying deeds have not been uploaded.
 *
 * Parsing is regex-based and deterministic. When a block cannot be read it is
 * skipped rather than guessed at.
 */

export interface EcEntry {
  serial: string;
  nature: string;
  documentNumber?: string;
  date?: string;
  executant?: string;
  claimant?: string;
  amount?: string;
  page: number;
  raw: string;
}

const FIELD_PATTERNS: Record<string, RegExp> = {
  nature: /Nature of Deed\s*:\s*(.+)/i,
  documentNumber: /Document No\.?\s*:\s*(\S+)/i,
  date: /Date of Registration\s*:\s*(\S+)/i,
  executant: /Executant\s*:\s*(.+)/i,
  claimant: /Claimant\s*:\s*(.+)/i,
  amount: /(?:Consideration|Amount Secured)\s*:\s*(.+)/i,
};

function readPattern(block: string, key: keyof typeof FIELD_PATTERNS) {
  const pattern = FIELD_PATTERNS[key];
  if (!pattern) return undefined;
  const match = block.match(pattern);
  return match?.[1]?.trim();
}

/** Parses `Sl. n` blocks out of an EC. Handles both verbose and compact layouts. */
export function parseEcEntries(doc: VaultDocument): EcEntry[] {
  const entries: EcEntry[] = [];

  for (const page of doc.pages) {
    const blocks = page.text.split(/(?=^\s*Sl\.?\s*\d+)/m).slice(1);

    for (const block of blocks) {
      const serial = block.match(/Sl\.?\s*(\d+)/)?.[1] ?? String(entries.length + 1);

      // Verbose layout: one labelled field per line.
      const nature = readPattern(block, "nature");
      if (nature) {
        entries.push({
          serial,
          nature,
          documentNumber: readPattern(block, "documentNumber"),
          date: readPattern(block, "date"),
          executant: readPattern(block, "executant"),
          claimant: readPattern(block, "claimant"),
          amount: readPattern(block, "amount"),
          page: page.page,
          raw: block.trim(),
        });
        continue;
      }

      // Compact layout: "Sl. 1  SALE DEED  BNG-6-04412/2016-17  dated 30/11/2016"
      const compact = block.match(
        /Sl\.?\s*\d+\s+([A-Z][A-Z\s/]+?)\s+([A-Z]{2,4}-\d-\d{4,6}\/\d{4}-\d{2})\s+dated\s+(\d{1,2}\/\d{1,2}\/\d{4})/,
      );
      if (compact) {
        entries.push({
          serial,
          nature: (compact[1] ?? "").trim(),
          documentNumber: compact[2],
          date: compact[3],
          executant: block.match(/Executant\s*:\s*(.+)/i)?.[1]?.trim(),
          claimant: block.match(/Claimant\s*:\s*(.+)/i)?.[1]?.trim(),
          amount: block.match(/Consideration\s*:\s*(.+)/i)?.[1]?.trim(),
          page: page.page,
          raw: block.trim(),
        });
      }
    }
  }

  return entries;
}

function kindForNature(nature: string): TimelineEvent["kind"] {
  const n = nature.toUpperCase();
  if (n.includes("MORTGAGE")) return "encumbrance";
  if (n.includes("RELEASE") || n.includes("DISCHARGE")) return "encumbrance";
  if (n.includes("SALE") || n.includes("PARTITION") || n.includes("GIFT")) {
    return "transfer";
  }
  return "registration";
}

export function buildTimeline(
  allDocs: VaultDocument[],
  findings: Finding[],
): TimelineEvent[] {
  const docs = activeDocuments(allDocs).filter(
    (d) => d.status === "ready" || d.status === "needs_review",
  );

  const events: TimelineEvent[] = [];
  const seenRegistrations = new Set<string>();

  // 1. Registered instruments held in the vault.
  for (const doc of docs) {
    if (doc.docType !== "sale_deed" && doc.docType !== "mother_deed") continue;
    const dateRaw = fieldValue(doc, "registration_date");
    const parsed = dateRaw ? parseIndianDate(dateRaw) : null;
    if (!parsed) continue;

    const regNo = fieldValue(doc, "registration_number") ?? "";
    if (regNo) seenRegistrations.add(regNo.replace(/[^A-Za-z0-9]/g, "").toUpperCase());

    const vendor = fieldValue(doc, "vendor_name") ?? "—";
    const purchaser = fieldValue(doc, "purchaser_name") ?? "—";
    const consideration = fieldValue(doc, "consideration");

    events.push({
      id: `tl-${doc.id}`,
      date: parsed.toISOString(),
      kind: "transfer",
      title: `${documentTypeMeta(doc.docType).label} — ${vendor} to ${purchaser}`,
      detail:
        `${regNo || "Document number not extracted"}` +
        (consideration ? ` · ${consideration}` : "") +
        ` · held in vault`,
      documentId: doc.id,
      confidence: doc.docTypeConfidence,
    });
  }

  // 2. Entries recorded in an EC. These often describe instruments the vault
  //    does not hold, which is precisely why they matter.
  for (const doc of docs) {
    if (doc.docType !== "encumbrance_certificate") continue;
    for (const entry of parseEcEntries(doc)) {
      const parsed = entry.date ? parseIndianDate(entry.date) : null;
      if (!parsed) continue;

      const normalised = (entry.documentNumber ?? "")
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase();

      // If the vault holds the deed itself, step 1 already emitted a richer
      // event for it. Emitting the EC line as well would show every registered
      // transfer twice on the axis.
      if (normalised.length > 0 && seenRegistrations.has(normalised)) continue;

      const parties =
        entry.executant && entry.claimant
          ? `${entry.executant} → ${entry.claimant}`
          : (entry.claimant ?? entry.executant ?? "");

      events.push({
        id: `tl-${doc.id}-ec-${entry.serial}`,
        date: parsed.toISOString(),
        kind: kindForNature(entry.nature),
        title: `${entry.nature}${parties ? ` — ${parties}` : ""}`,
        detail:
          `${entry.documentNumber ?? "number not read"}` +
          (entry.amount ? ` · ${entry.amount}` : "") +
          " · recorded in EC · deed not uploaded",
        documentId: doc.id,
      });
    }
  }

  // 3. Municipal and revenue events.
  for (const doc of docs) {
    if (doc.docType === "khata") {
      const transferred =
        doc.pages
          .map((p) => p.text.match(/Khata (?:Transferred|Registered) On\s*:\s*(\S+)/i)?.[1])
          .find(Boolean) ?? undefined;
      const parsed = transferred ? parseIndianDate(transferred) : null;
      if (parsed) {
        events.push({
          id: `tl-${doc.id}-khata`,
          date: parsed.toISOString(),
          kind: "municipal",
          title: "Khata recorded in current owner's name",
          detail: `${fieldValue(doc, "khata_number") ?? "khata number not read"} · ${
            fieldValue(doc, "khata_class") ?? "classification not read"
          }`,
          documentId: doc.id,
        });
      }
    }

    if (doc.docType === "conversion_order") {
      const parsed = parseIndianDate(fieldValue(doc, "order_date") ?? "");
      if (parsed) {
        events.push({
          id: `tl-${doc.id}-conv`,
          date: parsed.toISOString(),
          kind: "municipal",
          title: "Land conversion permitted",
          detail: `${fieldValue(doc, "order_number") ?? ""} · ${
            fieldValue(doc, "purpose") ?? ""
          }`,
          documentId: doc.id,
        });
      }
    }

    if (doc.docType === "tax_receipt") {
      const parsed = parseIndianDate(fieldValue(doc, "payment_date") ?? "");
      if (parsed) {
        events.push({
          id: `tl-${doc.id}-tax`,
          date: parsed.toISOString(),
          kind: "tax",
          title: `Tax paid for ${fieldValue(doc, "assessment_year") ?? "unknown year"}`,
          detail: `${fieldValue(doc, "amount_paid") ?? ""} · receipt ${
            fieldValue(doc, "receipt_number") ?? "not read"
          }`,
          documentId: doc.id,
        });
      }
    }
  }

  // 4. A break in the chain is rendered on the same axis so it is visible in
  //    sequence rather than buried in a findings list. Only a genuine break
  //    earns a marker: a parent deed that an EC does evidence is already
  //    represented by that EC entry, annotated "deed not uploaded".
  for (const finding of findings) {
    if (finding.code !== "OWNERSHIP_CHAIN_GAP") continue;
    if (finding.severity !== "critical") continue;
    const cited = finding.detail.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
    const parsed = cited ? parseIndianDate(cited) : null;
    events.push({
      id: `tl-gap-${finding.id}`,
      date: (parsed ?? new Date("2000-01-01")).toISOString(),
      kind: "gap",
      title: finding.title,
      detail: finding.detail,
    });
  }

  return events.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
