import type { ExtractedField, VaultDocument } from "./types";

/**
 * Resolution rule for extracted facts: a human correction always wins.
 *
 * Everything that reads an extracted value must go through here. Reading
 * `field.aiValue` directly anywhere outside this module is a bug, because it
 * would silently ignore a reviewer's correction.
 */
export function effectiveValue(field: ExtractedField): string {
  return field.humanValue ?? field.aiValue;
}

export function isReviewed(field: ExtractedField): boolean {
  return field.status !== "unreviewed";
}

export function findField(
  doc: VaultDocument,
  key: string,
): ExtractedField | undefined {
  return doc.fields.find((f) => f.key === key);
}

export function fieldValue(
  doc: VaultDocument,
  key: string,
): string | undefined {
  const field = findField(doc, key);
  return field ? effectiveValue(field) : undefined;
}

export interface FieldOccurrence {
  document: VaultDocument;
  field: ExtractedField;
  value: string;
}

/** Every occurrence of a field key across a document set, in upload order. */
export function collectField(
  docs: VaultDocument[],
  key: string,
): FieldOccurrence[] {
  const out: FieldOccurrence[] = [];
  for (const document of docs) {
    const field = findField(document, key);
    if (field) out.push({ document, field, value: effectiveValue(field) });
  }
  return out;
}

/** Documents that count as live evidence: not duplicates, not failed. */
export function activeDocuments(docs: VaultDocument[]): VaultDocument[] {
  return docs.filter((d) => d.status !== "duplicate" && d.status !== "failed");
}

export function unreviewedFieldCount(docs: VaultDocument[]): number {
  return activeDocuments(docs).reduce(
    (sum, d) => sum + d.fields.filter((f) => !isReviewed(f)).length,
    0,
  );
}

export function averageConfidence(docs: VaultDocument[]): number {
  const fields = activeDocuments(docs).flatMap((d) => d.fields);
  if (fields.length === 0) return 0;
  const total = fields.reduce((sum, f) => sum + f.aiConfidence, 0);
  return total / fields.length;
}
