"use client";

import { useMemo, useState } from "react";
import { Check, Lock, Pencil, RotateCcw, X } from "lucide-react";

import {
  Badge,
  Button,
  ConfidenceBar,
  Disclaimer,
  EmptyState,
  Panel,
  PanelHeader,
  cx,
  inputClass,
} from "@/components/ui";
import { formatDateTime } from "@/domain/clock";
import { documentTypeMeta } from "@/domain/document-types";
import { effectiveValue } from "@/domain/fields";
import type { ExtractedField, VaultDocument } from "@/domain/types";

type Filter = "pending" | "low" | "all";

const FILTER_LABEL: Record<Filter, string> = {
  pending: "Awaiting review",
  low: "Below trust threshold",
  all: "Every field",
};

function FieldRow({
  field,
  document: doc,
  canEdit,
  onApprove,
  onCorrect,
  onReopen,
  onOpenEvidence,
}: {
  field: ExtractedField;
  document: VaultDocument;
  canEdit: boolean;
  onApprove: () => void;
  onCorrect: (value: string) => void;
  onReopen: () => void;
  onOpenEvidence: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(effectiveValue(field));

  const weak = field.aiConfidence < 0.85;

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] text-ink-400">{field.label}</p>
            <span className="font-mono text-[10px] text-ink-600">
              {field.key}
            </span>
            {weak && field.status === "unreviewed" ? (
              <Badge tone="attention">low confidence</Badge>
            ) : null}
            <Badge
              tone={
                field.status === "corrected"
                  ? "graph"
                  : field.status === "approved"
                    ? "verified"
                    : "neutral"
              }
            >
              {field.status}
            </Badge>
          </div>

          {editing ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                className={cx(inputClass, "max-w-md flex-1")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onCorrect(draft);
                  setEditing(false);
                }}
                disabled={draft.trim().length === 0}
              >
                Save correction
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(effectiveValue(field));
                  setEditing(false);
                }}
              >
                <X size={13} />
              </Button>
            </div>
          ) : (
            <p className="mt-1 text-sm font-medium text-ink-100">
              {effectiveValue(field)}
            </p>
          )}

          {field.humanValue && field.humanValue !== field.aiValue ? (
            <p className="mt-1 text-[10px] text-ink-500">
              machine read{" "}
              <span className="line-through">{field.aiValue}</span> · the machine
              value is kept so reprocessing cannot undo this correction
            </p>
          ) : null}

          {field.reviewedBy ? (
            <p className="mt-1 text-[10px] text-ink-500">
              {field.status} by {field.reviewedBy}
              {field.reviewedAt ? ` · ${formatDateTime(field.reviewedAt)}` : ""}
            </p>
          ) : null}

          <button
            onClick={onOpenEvidence}
            className="mt-2 block w-full max-w-2xl rounded border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-left font-mono text-[10px] leading-relaxed text-ink-400 hover:border-ink-600 hover:text-ink-300"
          >
            {documentTypeMeta(doc.docType).shortLabel} p{field.evidence.page} ·{" "}
            {field.evidence.snippet}
          </button>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <ConfidenceBar value={field.aiConfidence} />
          {canEdit ? (
            <div className="flex gap-1.5">
              {field.status === "unreviewed" ? (
                <>
                  <Button size="sm" variant="primary" onClick={onApprove}>
                    <Check size={13} />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={13} />
                    Correct
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={13} />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onReopen}>
                    <RotateCcw size={13} />
                    Reopen
                  </Button>
                </>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-ink-600">
              <Lock size={10} />
              read-only role
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function ReviewTab({
  documents,
  canEdit,
  onApprove,
  onCorrect,
  onReopen,
  onOpenEvidence,
}: {
  documents: VaultDocument[];
  canEdit: boolean;
  onApprove: (docId: string, key: string) => void;
  onCorrect: (docId: string, key: string, value: string) => void;
  onReopen: (docId: string, key: string) => void;
  onOpenEvidence: (docId: string, page: number, snippet: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("pending");

  const groups = useMemo(() => {
    const usable = documents.filter(
      (d) => d.status === "ready" || d.status === "needs_review",
    );
    return usable
      .map((doc) => ({
        doc,
        fields: doc.fields.filter((f) => {
          if (filter === "all") return true;
          if (filter === "pending") return f.status === "unreviewed";
          return f.aiConfidence < 0.85;
        }),
      }))
      .filter((g) => g.fields.length > 0);
  }, [documents, filter]);

  const totals = useMemo(() => {
    const all = documents.flatMap((d) => d.fields);
    return {
      all: all.length,
      pending: all.filter((f) => f.status === "unreviewed").length,
      corrected: all.filter((f) => f.status === "corrected").length,
      low: all.filter((f) => f.aiConfidence < 0.85).length,
    };
  }, [documents]);

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Extraction review"
          subtitle="A reviewer's correction is stored beside the machine value, never on top of it. That is what lets a corrected field survive a reprocess when the extraction prompt is later improved."
          action={
            <div className="flex gap-1">
              {(["pending", "low", "all"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    filter === f
                      ? "bg-ink-800 text-ink-100"
                      : "text-ink-400 hover:bg-ink-850 hover:text-ink-200",
                  )}
                >
                  {FILTER_LABEL[f]}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid grid-cols-2 divide-x divide-ink-700 border-b border-ink-700 sm:grid-cols-4">
          {[
            { label: "Total fields", value: totals.all },
            { label: "Awaiting review", value: totals.pending },
            { label: "Below 85%", value: totals.low },
            { label: "Corrected by a human", value: totals.corrected },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-3">
              <p className="text-[10px] tracking-wide text-ink-500 uppercase">
                {stat.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-ink-100">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={<Check size={22} />}
            title={
              filter === "pending"
                ? "Nothing awaiting review"
                : "No fields match this filter"
            }
            description={
              filter === "pending"
                ? "Every extracted field on this property has been signed off or corrected."
                : "Switch the filter to see the rest of the extraction."
            }
          />
        ) : (
          <div>
            {groups.map(({ doc, fields }) => (
              <section key={doc.id}>
                <div className="flex items-center justify-between gap-3 border-y border-ink-700 bg-ink-850 px-5 py-2">
                  <p className="text-[11px] font-medium text-ink-200">
                    {documentTypeMeta(doc.docType).label}
                    <span className="ml-2 font-normal text-ink-500">
                      {doc.fileName}
                    </span>
                  </p>
                  <span className="text-[10px] text-ink-500">
                    {fields.length} field{fields.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="divide-y divide-ink-700">
                  {fields.map((field) => (
                    <FieldRow
                      key={`${doc.id}-${field.key}`}
                      field={field}
                      document={doc}
                      canEdit={canEdit}
                      onApprove={() => onApprove(doc.id, field.key)}
                      onCorrect={(value) => onCorrect(doc.id, field.key, value)}
                      onReopen={() => onReopen(doc.id, field.key)}
                      onOpenEvidence={() =>
                        onOpenEvidence(
                          doc.id,
                          field.evidence.page,
                          field.evidence.snippet,
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <Disclaimer>
        Approving a field records who approved it and when. Correcting one records
        both the machine value and the human value. Neither action is a legal
        opinion on the document; it is a statement that the text was read
        correctly.
      </Disclaimer>
    </div>
  );
}
