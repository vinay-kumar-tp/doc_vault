import { DEMO_NOW } from "./clock";
import { runConsistencyChecks } from "./consistency";
import { activeDocuments } from "./fields";
import { ruleSetFor } from "./rules";
import type {
  ComplianceItem,
  ComplianceItemState,
  ComplianceReport,
  Finding,
  Property,
  VaultDocument,
} from "./types";

/**
 * Rule-based completeness evaluation.
 *
 * No model participates in this decision. A checklist item is present because a
 * document of the required type exists on the property, full stop. The report
 * records the rule-set version it was evaluated against so a report generated
 * today still means the same thing after the checklist is revised.
 */

function stateFor(matching: VaultDocument[]): ComplianceItemState {
  if (matching.length === 0) return "missing";
  const anyFullyReviewed = matching.some(
    (doc) =>
      doc.fields.length > 0 &&
      doc.fields.every((f) => f.status !== "unreviewed"),
  );
  return anyFullyReviewed ? "present" : "present_unreviewed";
}

export function evaluateCompliance(
  property: Property,
  allDocs: VaultDocument[],
): ComplianceReport {
  const ruleSet = ruleSetFor(property.kind);
  const docs = activeDocuments(allDocs).filter(
    (d) => d.status === "ready" || d.status === "needs_review",
  );

  const items: ComplianceItem[] = ruleSet.rules.map((rule) => {
    const matching = docs.filter((d) => d.docType === rule.documentType);
    return {
      rule,
      state: stateFor(matching),
      documentIds: matching.map((d) => d.id),
    };
  });

  const requiredItems = items.filter((i) => i.rule.required);
  const requiredPresent = requiredItems.filter(
    (i) => i.state !== "missing",
  ).length;
  const requiredTotal = requiredItems.length;

  const missingFindings: Finding[] = requiredItems
    .filter((i) => i.state === "missing")
    .map((item) => ({
      id: `finding-missing-${item.rule.id}`,
      code: "MISSING_DOCUMENT" as const,
      severity: "attention" as const,
      title: `${item.rule.label} has not been uploaded`,
      detail: `${item.rule.rationale} This item is required by "${ruleSet.label}" (version ${ruleSet.version}).`,
      evidence: [],
      owner: "reviewer" as const,
    }));

  // Missing-document findings are produced here and consistency findings there,
  // so the combined list has to be re-sorted. Without this the report would open
  // with an attention item while a critical sat below it.
  const severityRank = { critical: 0, attention: 1, info: 2 } as const;
  const findings = [
    ...missingFindings,
    ...runConsistencyChecks(property, allDocs),
  ].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    propertyId: property.id,
    ruleSetId: ruleSet.id,
    ruleSetVersion: ruleSet.version,
    generatedAt: DEMO_NOW.toISOString(),
    items,
    requiredTotal,
    requiredPresent,
    completenessPct:
      requiredTotal === 0
        ? 0
        : Math.round((requiredPresent / requiredTotal) * 100),
    findings,
  };
}

export function countBySeverity(findings: Finding[]) {
  return {
    critical: findings.filter((f) => f.severity === "critical").length,
    attention: findings.filter((f) => f.severity === "attention").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
}

/**
 * A single readiness band for the dashboard.
 *
 * Deliberately NOT called a "trust score" or a "clearance". It is a description
 * of how complete and how reconciled the paperwork is, and nothing more.
 */
export type ReadinessBand = "blocked" | "review" | "assembled";

export function readinessBand(report: ComplianceReport): ReadinessBand {
  const counts = countBySeverity(report.findings);
  if (counts.critical > 0) return "blocked";
  if (counts.attention > 0 || report.completenessPct < 100) return "review";
  return "assembled";
}

export const READINESS_COPY: Record<
  ReadinessBand,
  { label: string; description: string }
> = {
  blocked: {
    label: "Professional review required",
    description:
      "At least one finding cannot be resolved from the documents alone and needs a qualified opinion.",
  },
  review: {
    label: "Reviewer action pending",
    description:
      "The file is progressing. Items are outstanding but none of them require a legal determination.",
  },
  assembled: {
    label: "Documentation assembled",
    description:
      "Every required document is present and reconciled. This describes the paperwork only, not the title.",
  },
};
