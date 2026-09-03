"use client";

import {
  AlertTriangle,
  Banknote,
  Building,
  FileSignature,
  Landmark,
  Receipt,
} from "lucide-react";

import {
  Badge,
  Disclaimer,
  EmptyState,
  Panel,
  PanelHeader,
  cx,
} from "@/components/ui";
import { formatDate } from "@/domain/clock";
import type { TimelineEvent, TimelineKind, VaultDocument } from "@/domain/types";

const KIND_META: Record<
  TimelineKind,
  { icon: typeof FileSignature; tone: string; ring: string; label: string }
> = {
  transfer: {
    icon: FileSignature,
    tone: "text-brand-300",
    ring: "border-brand-400/50 bg-brand-500/15",
    label: "Transfer",
  },
  registration: {
    icon: Landmark,
    tone: "text-ink-300",
    ring: "border-ink-600 bg-ink-800",
    label: "Registration",
  },
  encumbrance: {
    icon: Banknote,
    tone: "text-attention-500",
    ring: "border-attention-500/50 bg-attention-500/15",
    label: "Encumbrance",
  },
  tax: {
    icon: Receipt,
    tone: "text-verified-500",
    ring: "border-verified-500/50 bg-verified-500/15",
    label: "Tax",
  },
  municipal: {
    icon: Building,
    tone: "text-graph-500",
    ring: "border-graph-500/50 bg-graph-500/15",
    label: "Municipal",
  },
  gap: {
    icon: AlertTriangle,
    tone: "text-critical-500",
    ring: "border-critical-500/50 bg-critical-500/15",
    label: "Gap",
  },
};

export function TimelineTab({
  events,
  documents,
  onOpenDocument,
}: {
  events: TimelineEvent[];
  documents: VaultDocument[];
  onOpenDocument: (documentId: string, page: number) => void;
}) {
  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.kind] = (acc[event.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Property timeline"
          subtitle="Assembled from registered instruments held in the vault and from the entry table inside the Encumbrance Certificate. An EC records transactions whose deeds you may not have, which is exactly why it matters."
          action={
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(counts).map(([kind, count]) => (
                <Badge
                  key={kind}
                  tone={
                    kind === "gap"
                      ? "critical"
                      : kind === "encumbrance"
                        ? "attention"
                        : "neutral"
                  }
                >
                  {count} {KIND_META[kind as TimelineKind]?.label ?? kind}
                </Badge>
              ))}
            </div>
          }
        />

        {events.length === 0 ? (
          <EmptyState
            title="No dated events yet"
            description="Registration dates, EC entries and payment dates appear here once documents are processed."
          />
        ) : (
          <ol className="px-5 py-5">
            {events.map((event, index) => {
              const meta = KIND_META[event.kind];
              const Icon = meta.icon;
              const doc = event.documentId
                ? documents.find((d) => d.id === event.documentId)
                : undefined;
              const notUploaded = event.detail.includes("deed not uploaded");

              return (
                <li key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        meta.ring,
                        meta.tone,
                      )}
                    >
                      <Icon size={14} />
                    </span>
                    {index < events.length - 1 ? (
                      <span className="my-1 w-px flex-1 bg-ink-700" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 pb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-ink-400">
                        {formatDate(event.date)}
                      </span>
                      <Badge
                        tone={
                          event.kind === "gap"
                            ? "critical"
                            : event.kind === "encumbrance"
                              ? "attention"
                              : "neutral"
                        }
                      >
                        {meta.label}
                      </Badge>
                      {notUploaded ? (
                        <Badge tone="attention">deed not in vault</Badge>
                      ) : null}
                    </div>

                    <p
                      className={cx(
                        "mt-1.5 text-sm font-medium",
                        event.kind === "gap" ? "text-critical-500" : "text-ink-100",
                      )}
                    >
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-400">
                      {event.detail}
                    </p>

                    {doc ? (
                      <button
                        onClick={() => onOpenDocument(doc.id, 1)}
                        className="mt-2 text-[11px] font-medium text-brand-300 hover:text-brand-400"
                      >
                        Open {doc.fileName}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <Disclaimer>
        A timeline built from these documents describes what was registered and
        recorded, in the order it happened. It cannot show anything unregistered,
        anything outside the period an EC actually searched, or anything filed in
        a different sub-registrar office.
      </Disclaimer>
    </div>
  );
}
