"use client";

import { useMemo } from "react";

import { FindingCard } from "@/components/finding-card";
import {
  Badge,
  Disclaimer,
  KeyValue,
  Meter,
  Panel,
  PanelHeader,
  StatCard,
} from "@/components/ui";
import { formatDate } from "@/domain/clock";
import { READINESS_COPY, countBySeverity, readinessBand } from "@/domain/compliance";
import { documentTypeMeta } from "@/domain/document-types";
import { activeDocuments, averageConfidence, collectField, unreviewedFieldCount } from "@/domain/fields";
import { extentToSqFt, formatSqFt, normaliseSurveyNumber } from "@/domain/normalize";
import { PROPERTY_KIND_LABEL, ruleSetFor } from "@/domain/rules";
import { LEGAL_DISCLAIMER, type ComplianceReport, type Property, type VaultDocument } from "@/domain/types";
import { formatPaise } from "@/sim/pipeline";

/**
 * Reconciled facts.
 *
 * Rather than showing what one document says, each row shows whether all the
 * documents agree. Agreement is the actual product; a single value copied out of
 * a sale deed is what a folder already gives you.
 */
function ReconciledFacts({
  documents,
}: {
  documents: VaultDocument[];
}) {
  const rows = useMemo(() => {
    const docs = activeDocuments(documents);

    function reconcile(
      key: string,
      label: string,
      normalise: (v: string) => string,
      render: (v: string) => string = (v) => v,
    ) {
      const occ = collectField(docs, key);
      if (occ.length === 0) {
        return { label, value: <span className="text-ink-500">not extracted</span> };
      }
      const groups = new Map<string, number>();
      for (const o of occ) {
        const k = normalise(o.value);
        groups.set(k, (groups.get(k) ?? 0) + 1);
      }
      const agreed = groups.size === 1;
      const first = [...groups.keys()][0] ?? "";
      return {
        label,
        value: (
          <span className="flex items-center justify-end gap-2">
            <span className={agreed ? "text-ink-100" : "text-critical-500"}>
              {agreed ? render(first) : `${groups.size} conflicting values`}
            </span>
            <Badge tone={agreed ? "verified" : "critical"}>
              {agreed ? `${occ.length} docs agree` : "disputed"}
            </Badge>
          </span>
        ),
      };
    }

    return [
      reconcile("survey_number", "Survey number", normaliseSurveyNumber),
      reconcile("extent", "Extent", (v) => String(extentToSqFt(v) ?? v), (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? formatSqFt(n) : v;
      }),
      reconcile("khata_number", "Khata number", (v) => v.replace(/\s/g, "")),
      reconcile("village", "Village / hobli", (v) => v.toUpperCase().replace(/\s/g, "")),
    ];
  }, [documents]);

  return <KeyValue rows={rows} />;
}

export function OverviewTab({
  property,
  documents,
  report,
  onOpenDocument,
  onGoToFindings,
}: {
  property: Property;
  documents: VaultDocument[];
  report: ComplianceReport;
  onOpenDocument: (documentId: string, page: number) => void;
  onGoToFindings: () => void;
}) {
  const band = readinessBand(report);
  const counts = countBySeverity(report.findings);
  const ruleSet = ruleSetFor(property.kind);
  const cost = documents.reduce(
    (s, d) => s + d.usage.ocrCostPaise + d.usage.llmCostPaise,
    0,
  );
  const pages = documents.reduce((s, d) => s + d.usage.pagesProcessed, 0);
  const topFindings = report.findings
    .filter((f) => f.severity !== "info")
    .slice(0, 3);

  const tone =
    band === "blocked" ? "critical" : band === "review" ? "attention" : "verified";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Documentation"
          value={`${report.completenessPct}%`}
          tone={tone}
          hint={`${report.requiredPresent} of ${report.requiredTotal} required documents present`}
        />
        <StatCard
          label="Needs a professional"
          value={counts.critical}
          tone={counts.critical > 0 ? "critical" : "verified"}
          hint="Findings the platform will not decide"
        />
        <StatCard
          label="Fields to review"
          value={unreviewedFieldCount(documents)}
          tone={unreviewedFieldCount(documents) > 0 ? "attention" : "verified"}
          hint={`Mean extraction confidence ${Math.round(averageConfidence(documents) * 100)}%`}
        />
        <StatCard
          label="Processing spend"
          value={formatPaise(cost)}
          hint={`${pages} pages · ${documents.length} documents`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title={READINESS_COPY[band].label}
              subtitle={READINESS_COPY[band].description}
              action={<Badge tone={tone}>{band}</Badge>}
            />
            <div className="px-5 py-5">
              <Meter
                value={report.completenessPct}
                tone={tone}
                label={`Evaluated against "${ruleSet.label}" version ${ruleSet.version} on ${formatDate(report.generatedAt)}`}
              />
              <p className="mt-4 text-xs leading-relaxed text-ink-400">
                The report records which checklist version it ran against. Revising
                the checklist later produces a new report rather than silently
                changing the meaning of this one.
              </p>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Findings needing action"
              subtitle="Ordered by who has to resolve them, not by which file they came from."
              action={
                report.findings.length > topFindings.length ? (
                  <button
                    onClick={onGoToFindings}
                    className="text-[11px] font-medium text-brand-300 hover:text-brand-400"
                  >
                    View all {report.findings.length}
                  </button>
                ) : null
              }
            />
            <div className="space-y-3 px-5 py-4">
              {topFindings.length === 0 ? (
                <p className="py-4 text-center text-xs text-ink-400">
                  Nothing outstanding. Every required document is present and the
                  cross-document checks agree.
                </p>
              ) : (
                topFindings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    documents={documents}
                    onOpenDocument={onOpenDocument}
                  />
                ))
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Reconciled facts"
              subtitle="Whether the documents agree, not what one of them says."
            />
            <div className="px-5 py-3">
              <ReconciledFacts documents={documents} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Property identity" />
            <div className="px-5 py-3">
              <KeyValue
                rows={[
                  { label: "Reference", value: <span className="font-mono">{property.ref}</span> },
                  { label: "Type", value: PROPERTY_KIND_LABEL[property.kind] },
                  { label: "Address", value: property.address.line1 },
                  {
                    label: "Locality",
                    value: `${property.address.locality}, ${property.address.city}`,
                  },
                  {
                    label: "District",
                    value: `${property.address.district}, ${property.address.state} ${property.address.pincode}`,
                  },
                  { label: "Survey no.", value: property.parcel.surveyNumber ?? "—" },
                  { label: "Khata no.", value: property.parcel.khataNumber ?? "—" },
                  { label: "PID", value: property.parcel.pid ?? "—" },
                  { label: "Village / hobli", value: [property.parcel.village, property.parcel.hobli].filter(Boolean).join(" / ") || "—" },
                  { label: "Stated extent", value: property.statedExtent ?? "—" },
                  { label: "Created", value: `${formatDate(property.createdAt)} by ${property.createdBy}` },
                ]}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Documents on file" />
            <ul className="divide-y divide-ink-700">
              {documents.length === 0 ? (
                <li className="px-5 py-6 text-center text-xs text-ink-400">
                  No documents yet.
                </li>
              ) : (
                documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 px-5 py-2.5"
                  >
                    <button
                      onClick={() => onOpenDocument(doc.id, 1)}
                      className="min-w-0 text-left"
                    >
                      <p className="truncate text-xs font-medium text-ink-200 hover:text-brand-300">
                        {documentTypeMeta(doc.docType).label}
                      </p>
                      <p className="truncate text-[10px] text-ink-500">
                        {doc.fileName}
                      </p>
                    </button>
                    <Badge
                      tone={
                        doc.status === "ready"
                          ? "verified"
                          : doc.status === "needs_review"
                            ? "attention"
                            : doc.status === "duplicate"
                              ? "neutral"
                              : doc.status === "failed"
                                ? "critical"
                                : "brand"
                      }
                    >
                      {doc.status.replace("_", " ")}
                    </Badge>
                  </li>
                ))
              )}
            </ul>
          </Panel>

          <Disclaimer>{LEGAL_DISCLAIMER}</Disclaimer>
        </div>
      </div>
    </div>
  );
}
