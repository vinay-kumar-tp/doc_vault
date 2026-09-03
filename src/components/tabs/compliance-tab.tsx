"use client";

import { useState } from "react";
import { Check, CircleSlash, Clock } from "lucide-react";

import { FindingCard } from "@/components/finding-card";
import {
  Badge,
  Disclaimer,
  Meter,
  Panel,
  PanelHeader,
  cx,
} from "@/components/ui";
import { formatDateTime } from "@/domain/clock";
import {
  READINESS_COPY,
  countBySeverity,
  readinessBand,
} from "@/domain/compliance";
import { documentTypeMeta } from "@/domain/document-types";
import { ruleSetFor } from "@/domain/rules";
import {
  LEGAL_DISCLAIMER,
  type ComplianceItemState,
  type ComplianceReport,
  type Property,
  type Severity,
  type VaultDocument,
} from "@/domain/types";

const STATE_META: Record<
  ComplianceItemState,
  { icon: typeof Check; tone: string; label: string }
> = {
  present: {
    icon: Check,
    tone: "text-verified-500 border-verified-500/40 bg-verified-500/10",
    label: "on file, reviewed",
  },
  present_unreviewed: {
    icon: Clock,
    tone: "text-attention-500 border-attention-500/40 bg-attention-500/10",
    label: "on file, unreviewed",
  },
  missing: {
    icon: CircleSlash,
    tone: "text-critical-500 border-critical-500/40 bg-critical-500/10",
    label: "not uploaded",
  },
};

type SeverityFilter = Severity | "all";

export function ComplianceTab({
  property,
  report,
  documents,
  onOpenDocument,
}: {
  property: Property;
  report: ComplianceReport;
  documents: VaultDocument[];
  onOpenDocument: (documentId: string, page: number) => void;
}) {
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const band = readinessBand(report);
  const counts = countBySeverity(report.findings);
  const ruleSet = ruleSetFor(property.kind);
  const tone =
    band === "blocked" ? "critical" : band === "review" ? "attention" : "verified";

  const visible =
    filter === "all"
      ? report.findings
      : report.findings.filter((f) => f.severity === filter);

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Due-diligence report"
          subtitle={`Evaluated against "${ruleSet.label}" version ${ruleSet.version}. The version is recorded on the report so revising the checklist later cannot change what this report meant.`}
          action={<Badge tone={tone}>{READINESS_COPY[band].label}</Badge>}
        />
        <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1fr_260px]">
          <div>
            <Meter
              value={report.completenessPct}
              tone={tone}
              label={`${report.requiredPresent} of ${report.requiredTotal} required documents · ${report.completenessPct}% complete`}
            />
            <p className="mt-4 text-xs leading-relaxed text-ink-300">
              {READINESS_COPY[band].description}
            </p>
            <p className="mt-2 text-[11px] text-ink-500">
              Generated {formatDateTime(report.generatedAt)} · rule set{" "}
              <span className="font-mono">{report.ruleSetId}</span> v
              {report.ruleSetVersion}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            {(
              [
                ["critical", counts.critical, "Professional"],
                ["attention", counts.attention, "Reviewer"],
                ["info", counts.info, "Informational"],
              ] as const
            ).map(([severity, count, label]) => (
              <button
                key={severity}
                onClick={() =>
                  setFilter((f) => (f === severity ? "all" : severity))
                }
                className={cx(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  filter === severity
                    ? "border-brand-500/50 bg-brand-500/10"
                    : "border-ink-700 bg-ink-850 hover:border-ink-600",
                )}
              >
                <p className="text-lg font-semibold text-ink-100">{count}</p>
                <p className="text-[10px] text-ink-400">{label}</p>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel>
          <PanelHeader
            title={`Findings · ${visible.length}`}
            subtitle="Grouped by who resolves them. The platform never assigns itself a legal determination."
            action={
              filter !== "all" ? (
                <button
                  onClick={() => setFilter("all")}
                  className="text-[11px] font-medium text-brand-300 hover:text-brand-400"
                >
                  Clear filter
                </button>
              ) : null
            }
          />
          <div className="space-y-3 px-5 py-4">
            {visible.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-400">
                No findings at this severity.
              </p>
            ) : (
              visible.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  documents={documents}
                  onOpenDocument={onOpenDocument}
                  defaultOpen={finding.severity === "critical"}
                />
              ))
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="Checklist"
              subtitle="Rules are stored as versioned data, not as code branches."
            />
            <ul className="divide-y divide-ink-700">
              {report.items.map((item) => {
                const meta = STATE_META[item.state];
                const Icon = meta.icon;
                const doc = documents.find((d) => d.id === item.documentIds[0]);
                return (
                  <li key={item.rule.id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cx(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          meta.tone,
                        )}
                      >
                        <Icon size={11} strokeWidth={2.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-medium text-ink-100">
                            {item.rule.label}
                          </p>
                          {item.rule.required ? null : (
                            <Badge tone="neutral">optional</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-ink-500">
                          {meta.label}
                          {item.documentIds.length > 1
                            ? ` · ${item.documentIds.length} documents`
                            : ""}
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-400">
                          {item.rule.rationale}
                        </p>
                        {doc ? (
                          <button
                            onClick={() => onOpenDocument(doc.id, 1)}
                            className="mt-1.5 text-[10px] font-medium text-brand-300 hover:text-brand-400"
                          >
                            {documentTypeMeta(doc.docType).shortLabel} ·{" "}
                            {doc.fileName}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Disclaimer>{LEGAL_DISCLAIMER}</Disclaimer>
        </div>
      </div>
    </div>
  );
}
