"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { Clock, Layers, Lock } from "lucide-react";

import { FindingCard } from "@/components/finding-card";
import {
  Badge,
  Disclaimer,
  KeyValue,
  Meter,
  Panel,
  PanelHeader,
} from "@/components/ui";
import { TimelineTab } from "@/components/tabs/timeline-tab";
import { formatDate, formatDateTime } from "@/domain/clock";
import { READINESS_COPY, readinessBand } from "@/domain/compliance";
import { documentTypeMeta } from "@/domain/document-types";
import { PROPERTY_KIND_LABEL, ruleSetFor } from "@/domain/rules";
import { LEGAL_DISCLAIMER } from "@/domain/types";
import { useVault } from "@/store/vault-store";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const {
    hydrated,
    shareByToken,
    propertyById,
    documentsFor,
    reportFor,
    timelineFor,
    recordShareView,
  } = useVault();

  const share = shareByToken(token);
  const logged = useRef(false);

  const revoked = Boolean(share?.revokedAt);
  const expired = share
    ? new Date(share.expiresAt).getTime() < Date.now()
    : false;
  const usable = Boolean(share) && !revoked && !expired;

  // Log the view once per mount, and only for a link that actually grants access.
  useEffect(() => {
    if (!usable || logged.current || !share) return;
    logged.current = true;
    recordShareView(share.token, "Anonymous link holder");
  }, [usable, share, recordShareView]);

  const property = share ? propertyById(share.propertyId) : undefined;
  const documents = useMemo(
    () => (share ? documentsFor(share.propertyId) : []),
    [documentsFor, share],
  );
  const report = share ? reportFor(share.propertyId) : undefined;
  const timeline = useMemo(
    () => (share ? timelineFor(share.propertyId) : []),
    [timelineFor, share],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xs text-ink-500">Opening shared workspace…</p>
      </div>
    );
  }

  if (!share || !property || !report) {
    return (
      <Gate
        title="Link not recognised"
        body="This share token does not exist in the current session. A demo reset clears every issued link."
      />
    );
  }

  if (revoked) {
    return (
      <Gate
        title="Access revoked"
        body={`The owner withdrew this link on ${formatDateTime(share.revokedAt ?? "")}. Revocation takes effect immediately and does not wait for the expiry.`}
      />
    );
  }

  if (expired) {
    return (
      <Gate
        title="Link expired"
        body={`This link lapsed on ${formatDateTime(share.expiresAt)}. Time-limited access is the default, not an option.`}
      />
    );
  }

  const can = (scope: string) => share.scopes.includes(scope as never);
  const band = readinessBand(report);
  const ruleSet = ruleSetFor(property.kind);
  const tone =
    band === "blocked" ? "critical" : band === "review" ? "attention" : "verified";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-700 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
            <Layers size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Real Estate Vault
            </p>
            <p className="text-[11px] text-ink-400">Shared property record</p>
          </div>
        </div>
        <div className="text-right">
          <Badge tone="verified">access granted</Badge>
          <p className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-ink-400">
            <Clock size={11} />
            expires {formatDateTime(share.expiresAt)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-600">
            shared with {share.audience}
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {share.scopes.map((scope) => (
          <span
            key={scope}
            className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-ink-400"
          >
            {scope}
          </span>
        ))}
        <span className="text-[10px] text-ink-600">
          · this view is limited to the scopes above and every open is logged
        </span>
      </div>

      <div className="mt-6 space-y-6">
        {can("summary:read") ? (
          <Panel>
            <PanelHeader
              title={property.title}
              subtitle={`${property.ref} · ${PROPERTY_KIND_LABEL[property.kind]} · ${property.address.locality}, ${property.address.city}`}
              action={<Badge tone={tone}>{READINESS_COPY[band].label}</Badge>}
            />
            <div className="grid gap-6 px-5 py-5 md:grid-cols-2">
              <div>
                <Meter
                  value={report.completenessPct}
                  tone={tone}
                  label={`${report.requiredPresent} of ${report.requiredTotal} required documents · "${ruleSet.label}" v${ruleSet.version}`}
                />
                <p className="mt-4 text-xs leading-relaxed text-ink-300">
                  {READINESS_COPY[band].description}
                </p>
              </div>
              <KeyValue
                rows={[
                  { label: "Survey number", value: property.parcel.surveyNumber ?? "—" },
                  { label: "Khata number", value: property.parcel.khataNumber ?? "—" },
                  {
                    label: "Village / hobli",
                    value:
                      [property.parcel.village, property.parcel.hobli]
                        .filter(Boolean)
                        .join(" / ") || "—",
                  },
                  { label: "Stated extent", value: property.statedExtent ?? "—" },
                  { label: "Report generated", value: formatDate(report.generatedAt) },
                ]}
              />
            </div>
          </Panel>
        ) : null}

        {can("compliance:read") ? (
          <Panel>
            <PanelHeader
              title={`Findings · ${report.findings.length}`}
              subtitle="Observations about the documents on file. Not a title opinion."
            />
            <div className="space-y-3 px-5 py-4">
              {report.findings.length === 0 ? (
                <p className="py-4 text-center text-xs text-ink-400">
                  No findings raised.
                </p>
              ) : (
                report.findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    documents={can("documents:read") ? documents : []}
                    defaultOpen={finding.severity === "critical"}
                  />
                ))
              )}
            </div>
          </Panel>
        ) : null}

        {can("documents:read") ? (
          <Panel>
            <PanelHeader
              title={`Documents · ${documents.length}`}
              subtitle="Read-only. In production each preview is served through a short-lived signed URL minted for this request."
            />
            <ul className="divide-y divide-ink-700">
              {documents.map((doc) => (
                <li key={doc.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink-100">
                        {documentTypeMeta(doc.docType).label}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-ink-500">
                        {doc.fileName} · {doc.pageCount} pages ·{" "}
                        {doc.fields.length} extracted fields
                      </p>
                    </div>
                    <Badge
                      tone={
                        doc.status === "ready"
                          ? "verified"
                          : doc.status === "needs_review"
                            ? "attention"
                            : "neutral"
                      }
                    >
                      {doc.status.replace("_", " ")}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {can("timeline:read") ? (
          <TimelineTab
            events={timeline}
            documents={documents}
            onOpenDocument={() => undefined}
          />
        ) : null}

        {!can("timeline:read") || !can("documents:read") ? (
          <Panel className="flex items-center gap-3 px-5 py-4">
            <Lock size={15} className="shrink-0 text-ink-500" />
            <p className="text-[11px] leading-relaxed text-ink-400">
              Some sections are not included in this link&apos;s scopes. Narrow
              scopes are the point: a lender assessing completeness does not need
              the full text of every deed.
            </p>
          </Panel>
        ) : null}

        <Disclaimer>{LEGAL_DISCLAIMER}</Disclaimer>

        <p className="text-center text-[11px] text-ink-600">
          <Link href="/" className="hover:text-ink-400">
            Real Estate Vault — demo simulation
          </Link>
        </p>
      </div>
    </div>
  );
}

function Gate({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Panel className="max-w-md px-6 py-8 text-center">
        <Lock size={20} className="mx-auto mb-3 text-ink-500" />
        <h1 className="text-sm font-semibold text-ink-100">{title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-ink-400">{body}</p>
        <Link
          href="/"
          className="mt-5 inline-block text-xs font-medium text-brand-300 hover:text-brand-400"
        >
          Return to Real Estate Vault
        </Link>
      </Panel>
    </div>
  );
}
