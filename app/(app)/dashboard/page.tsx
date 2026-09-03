"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Building2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Disclaimer,
  KeyValue,
  Meter,
  Panel,
  PanelHeader,
  StatCard,
  cx,
} from "@/components/ui";
import { relativeTime } from "@/domain/clock";
import {
  READINESS_COPY,
  countBySeverity,
  readinessBand,
  type ReadinessBand,
} from "@/domain/compliance";
import { LEGAL_DISCLAIMER } from "@/domain/types";
import { PROPERTY_KIND_LABEL } from "@/domain/rules";
import { unreviewedFieldCount } from "@/domain/fields";
import { formatPaise } from "@/sim/pipeline";
import { useVault } from "@/store/vault-store";

const BAND_TONE: Record<ReadinessBand, "critical" | "attention" | "verified"> = {
  blocked: "critical",
  review: "attention",
  assembled: "verified",
};

const BAND_METER: Record<ReadinessBand, "critical" | "attention" | "verified"> = {
  blocked: "critical",
  review: "attention",
  assembled: "verified",
};

export default function DashboardPage() {
  const { properties, documents, audit, currentUser, reportFor } = useVault();

  const rows = useMemo(
    () =>
      properties.map((property) => {
        const docs = documents.filter((d) => d.propertyId === property.id);
        const report = reportFor(property.id);
        const counts = report
          ? countBySeverity(report.findings)
          : { critical: 0, attention: 0, info: 0 };
        return {
          property,
          docs,
          report,
          counts,
          band: report ? readinessBand(report) : ("review" as ReadinessBand),
        };
      }),
    [properties, documents, reportFor],
  );

  const totals = useMemo(() => {
    const processed = documents.filter(
      (d) => d.status === "ready" || d.status === "needs_review",
    );
    const pages = processed.reduce((s, d) => s + d.usage.pagesProcessed, 0);
    const cost = documents.reduce(
      (s, d) => s + d.usage.ocrCostPaise + d.usage.llmCostPaise,
      0,
    );
    const critical = rows.reduce((s, r) => s + r.counts.critical, 0);
    return {
      processed: processed.length,
      pages,
      cost,
      critical,
      pendingReview: unreviewedFieldCount(documents),
    };
  }, [documents, rows]);

  return (
    <>
      <PageHeader
        eyebrow={`Signed in as ${currentUser?.role}`}
        title={`Portfolio overview`}
        description="Three properties are seeded and already processed. RV-000002 is deliberately problematic — a chain gap, a survey number that disagrees with itself, and a mortgage with no traced release."
      />

      <div className="space-y-6 px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Properties"
            value={properties.length}
            hint={`${documents.length} documents in the vault`}
          />
          <StatCard
            label="Documents processed"
            value={totals.processed}
            hint={`${totals.pages} pages through OCR`}
          />
          <StatCard
            label="Processing spend"
            value={formatPaise(totals.cost)}
            hint="OCR plus extraction tokens, tracked per document"
          />
          <StatCard
            label="Need a professional"
            value={totals.critical}
            tone={totals.critical > 0 ? "critical" : "verified"}
            hint="Findings the platform will not decide on its own"
          />
          <StatCard
            label="Fields awaiting review"
            value={totals.pendingReview}
            tone={totals.pendingReview > 0 ? "attention" : "verified"}
            hint="Machine values held back until signed off"
          />
        </div>

        <Panel>
          <PanelHeader
            title="Properties"
            subtitle="Completeness is measured against the versioned checklist for each property type."
          />
          <ul className="divide-y divide-ink-700">
            {rows.map(({ property, docs, report, counts, band }) => (
              <li key={property.id}>
                <Link
                  href={`/properties/${property.id}`}
                  className="group flex flex-wrap items-center gap-5 px-5 py-4 transition-colors hover:bg-ink-850"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-500">
                        {property.ref}
                      </span>
                      <Badge tone={BAND_TONE[band]}>
                        {READINESS_COPY[band].label}
                      </Badge>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-ink-100">
                      {property.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-400">
                      {PROPERTY_KIND_LABEL[property.kind]} ·{" "}
                      {property.address.locality}, {property.address.city} ·{" "}
                      {docs.length} document{docs.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="w-40">
                    <Meter
                      value={report?.completenessPct ?? 0}
                      tone={BAND_METER[band]}
                      label={`${report?.requiredPresent ?? 0} of ${
                        report?.requiredTotal ?? 0
                      } required documents`}
                    />
                  </div>

                  <div className="flex w-32 flex-wrap gap-1.5">
                    {counts.critical > 0 ? (
                      <Badge tone="critical">{counts.critical} critical</Badge>
                    ) : null}
                    {counts.attention > 0 ? (
                      <Badge tone="attention">{counts.attention} attention</Badge>
                    ) : null}
                    {counts.critical === 0 && counts.attention === 0 ? (
                      <Badge tone="verified">reconciled</Badge>
                    ) : null}
                  </div>

                  <ArrowUpRight
                    size={15}
                    className={cx(
                      "shrink-0 text-ink-600 transition-colors",
                      "group-hover:text-ink-300",
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
          {rows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Building2 size={20} className="mx-auto mb-2 text-ink-600" />
              <p className="text-xs text-ink-400">
                No properties yet. Create one from the Properties page.
              </p>
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Panel>
            <PanelHeader
              title="Recent activity"
              subtitle="Every state change is recorded with an actor. Nothing mutates silently."
            />
            <ul className="divide-y divide-ink-700">
              {audit.slice(0, 8).map((event) => (
                <li key={event.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-ink-200">
                      <span className="font-medium">{event.actor}</span>{" "}
                      <span className="font-mono text-[11px] text-brand-300">
                        {event.action}
                      </span>{" "}
                      <span className="text-ink-400">{event.target}</span>
                    </p>
                    <span className="shrink-0 text-[11px] text-ink-500">
                      {relativeTime(event.at)}
                    </span>
                  </div>
                  {event.meta ? (
                    <p className="mt-1 text-[11px] text-ink-500">{event.meta}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="space-y-6">
            <Panel>
              <PanelHeader title="Cost per property" />
              <div className="px-5 py-4">
                <KeyValue
                  rows={rows.map(({ property, docs }) => {
                    const cost = docs.reduce(
                      (s, d) => s + d.usage.ocrCostPaise + d.usage.llmCostPaise,
                      0,
                    );
                    const pages = docs.reduce(
                      (s, d) => s + d.usage.pagesProcessed,
                      0,
                    );
                    return {
                      label: `${property.ref} · ${pages}pp`,
                      value: formatPaise(cost),
                    };
                  })}
                />
                <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
                  A fifty-document property at thirty pages each is fifteen
                  hundred pages. Pricing a verification package without this
                  number is guesswork, so it is tracked from the first upload.
                </p>
              </div>
            </Panel>

            <Disclaimer>{LEGAL_DISCLAIMER}</Disclaimer>
          </div>
        </div>
      </div>
    </>
  );
}
