"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";

import { Badge, SEVERITY_LABEL, SEVERITY_TONE, cx } from "@/components/ui";
import { documentTypeMeta } from "@/domain/document-types";
import type { Finding, VaultDocument } from "@/domain/types";

const OWNER_COPY: Record<Finding["owner"], string> = {
  platform: "Handled by the platform",
  reviewer: "Reviewer action",
  professional: "Requires a qualified professional",
};

export function FindingCard({
  finding,
  documents,
  onOpenDocument,
  defaultOpen = false,
}: {
  finding: Finding;
  documents: VaultDocument[];
  onOpenDocument?: (documentId: string, page: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const border =
    finding.severity === "critical"
      ? "border-critical-500/30"
      : finding.severity === "attention"
        ? "border-attention-500/30"
        : "border-ink-700";

  return (
    <div className={cx("rounded-[14px] border bg-ink-900", border)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0 text-ink-500">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={SEVERITY_TONE[finding.severity]}>
              {SEVERITY_LABEL[finding.severity]}
            </Badge>
            <span className="font-mono text-[10px] tracking-wide text-ink-500">
              {finding.code}
            </span>
          </span>
          <span className="mt-1.5 block text-sm font-medium text-ink-100">
            {finding.title}
          </span>
          {!open ? (
            <span className="mt-1 block truncate text-xs text-ink-400">
              {finding.detail}
            </span>
          ) : null}
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-ink-700 px-4 py-4">
          <p className="text-xs leading-relaxed text-ink-300">{finding.detail}</p>

          <p className="text-[11px] text-ink-500">
            {OWNER_COPY[finding.owner]}
          </p>

          {finding.evidence.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-medium tracking-wide text-ink-400 uppercase">
                Evidence
              </p>
              <ul className="space-y-2">
                {finding.evidence.map((ev, index) => {
                  const doc = documents.find((d) => d.id === ev.documentId);
                  return (
                    <li
                      key={`${ev.documentId}-${ev.page}-${index}`}
                      className="rounded-lg border border-ink-700 bg-ink-850 p-3"
                    >
                      <button
                        onClick={() => onOpenDocument?.(ev.documentId, ev.page)}
                        disabled={!doc || !onOpenDocument}
                        className={cx(
                          "flex items-center gap-1.5 text-[11px] font-medium",
                          doc && onOpenDocument
                            ? "text-brand-300 hover:text-brand-400"
                            : "text-ink-400",
                        )}
                      >
                        <FileText size={12} />
                        {doc
                          ? `${documentTypeMeta(doc.docType).label} · page ${ev.page}`
                          : `Document ${ev.documentId} · page ${ev.page}`}
                      </button>
                      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink-300">
                        {ev.snippet}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-ink-500">
              No page evidence — this finding is about a document that is absent.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
