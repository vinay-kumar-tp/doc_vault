"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Disclaimer,
  EmptyState,
  Panel,
  PanelHeader,
  cx,
} from "@/components/ui";
import { formatDateTime, relativeTime } from "@/domain/clock";
import { useVault } from "@/store/vault-store";

const ACTION_TONE: Record<string, "brand" | "verified" | "attention" | "critical" | "graph"> = {
  "property.created": "brand",
  "document.uploaded": "brand",
  "document.processed": "verified",
  "document.duplicate_blocked": "attention",
  "pipeline.stage_retried": "attention",
  "field.approved": "verified",
  "field.corrected": "graph",
  "share.created": "brand",
  "share.revoked": "critical",
  "share.viewed": "graph",
};

export default function AuditPage() {
  const { audit } = useVault();
  const [filter, setFilter] = useState<string>("all");

  const actions = useMemo(
    () => ["all", ...new Set(audit.map((e) => e.action))],
    [audit],
  );

  const visible = useMemo(
    () => (filter === "all" ? audit : audit.filter((e) => e.action === filter)),
    [audit, filter],
  );

  return (
    <>
      <PageHeader
        eyebrow="Accountability"
        title="Audit trail"
        description="Every state change records an actor, a target and a timestamp. A due-diligence artefact that cannot show who changed what, and when, is not defensible."
      />

      <div className="space-y-6 px-8 py-6">
        <Panel>
          <PanelHeader
            title={`${visible.length} event${visible.length === 1 ? "" : "s"}`}
            subtitle="Newest first."
            action={
              <div className="flex flex-wrap gap-1">
                {actions.slice(0, 7).map((action) => (
                  <button
                    key={action}
                    onClick={() => setFilter(action)}
                    className={cx(
                      "rounded px-2 py-1 font-mono text-[10px] transition-colors",
                      filter === action
                        ? "bg-ink-800 text-ink-100"
                        : "text-ink-500 hover:bg-ink-850 hover:text-ink-300",
                    )}
                  >
                    {action}
                  </button>
                ))}
              </div>
            }
          />
          {visible.length === 0 ? (
            <EmptyState
              title="No events"
              description="Actions you take in the demo appear here immediately."
            />
          ) : (
            <ul className="divide-y divide-ink-700">
              {visible.map((event) => (
                <li key={event.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={ACTION_TONE[event.action] ?? "neutral"}>
                          {event.action}
                        </Badge>
                        <span className="text-xs font-medium text-ink-100">
                          {event.actor}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-xs text-ink-300">
                        {event.target}
                      </p>
                      {event.meta ? (
                        <p className="mt-1 text-[11px] text-ink-500">
                          {event.meta}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-ink-400">
                        {relativeTime(event.at)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-600">
                        {formatDateTime(event.at)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Disclaimer>
          In production these rows are append-only and written in the same
          transaction as the change they describe, so an action cannot succeed
          without being logged.
        </Disclaimer>
      </div>
    </>
  );
}
