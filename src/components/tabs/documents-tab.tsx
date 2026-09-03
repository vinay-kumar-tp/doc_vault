"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

import { PipelineView } from "@/components/pipeline-view";
import {
  Badge,
  Button,
  ConfidenceBar,
  EmptyState,
  Panel,
  PanelHeader,
  cx,
} from "@/components/ui";
import { formatDateTime } from "@/domain/clock";
import { documentTypeMeta } from "@/domain/document-types";
import { effectiveValue } from "@/domain/fields";
import type { PipelineStageId, VaultDocument } from "@/domain/types";
import type { UploadableSample } from "@/demo/seed-documents";
import { formatPaise } from "@/sim/pipeline";

type Pane = "pages" | "extraction" | "pipeline";

const STATUS_TONE = {
  ready: "verified",
  needs_review: "attention",
  duplicate: "neutral",
  failed: "critical",
  processing: "brand",
  queued: "brand",
} as const;

function highlight(text: string, term: string | null) {
  if (!term || term.trim().length < 4) return text;
  const index = text.toLowerCase().indexOf(term.toLowerCase().slice(0, 60));
  if (index < 0) return text;
  const end = index + Math.min(term.length, 60);
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-brand-500/25 px-0.5 text-brand-200">
        {text.slice(index, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

export function DocumentsTab({
  documents,
  propertyId,
  selectedId,
  focusPage,
  focusSnippet,
  focusNonce,
  onSelect,
  onUpload,
  onRetry,
  canEdit,
  samples,
}: {
  documents: VaultDocument[];
  propertyId: string;
  selectedId: string | null;
  focusPage: number | null;
  focusSnippet: string | null;
  /** Bumped by the parent on every jump-to-evidence so repeat jumps re-fire. */
  focusNonce: number;
  onSelect: (id: string) => void;
  onUpload: (sampleId: string) => void;
  onRetry: (docId: string, stageId: PipelineStageId) => void;
  canEdit: boolean;
  samples: UploadableSample[];
}) {
  const [pane, setPane] = useState<Pane>("pages");
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);

  const selected = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? documents[0] ?? null,
    [documents, selectedId],
  );

  useEffect(() => {
    if (focusNonce > 0 && focusPage) {
      setPage(focusPage);
      setPane("pages");
    }
    // focusNonce is the trigger; focusPage alone would not re-fire on a repeat
    // jump to the same page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  // A document still in flight has nothing to read yet, so land on the pipeline.
  useEffect(() => {
    if (!selected) return;
    if (selected.pages.length === 0) setPane("pipeline");
  }, [selected]);

  const relevantSamples = samples.filter(
    (s) => !s.targetPropertyId || s.targetPropertyId === propertyId,
  );
  const otherSamples = samples.filter(
    (s) => s.targetPropertyId && s.targetPropertyId !== propertyId,
  );

  const activePage =
    selected?.pages.find((p) => p.page === page) ?? selected?.pages[0] ?? null;

  return (
    <div className="space-y-6">
      {canEdit ? (
        <Panel>
          <PanelHeader
            title="Add a document"
            subtitle="Pick a sample to push through the pipeline. Each one takes a different path."
            action={
              <Button
                variant={showUpload ? "secondary" : "primary"}
                size="sm"
                onClick={() => setShowUpload((v) => !v)}
              >
                {showUpload ? <X size={14} /> : <Upload size={14} />}
                {showUpload ? "Close" : "Upload"}
              </Button>
            }
          />
          {showUpload ? (
            <div className="space-y-3 px-5 py-4 anim-fade-up">
              {relevantSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-ink-700 bg-ink-850 p-3.5"
                >
                  <FileText size={16} className="shrink-0 text-ink-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink-100">
                      {sample.fileName}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
                      {sample.demonstrates}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-ink-600">
                    {(sample.sizeBytes / 1_048_576).toFixed(2)} MB
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onUpload(sample.id);
                      setShowUpload(false);
                    }}
                  >
                    Run pipeline
                  </Button>
                </div>
              ))}
              {otherSamples.length > 0 ? (
                <p className="text-[11px] leading-relaxed text-ink-500">
                  {otherSamples.length} further sample
                  {otherSamples.length === 1 ? " is" : "s are"} scoped to another
                  property in this demo and will not appear here.
                </p>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Panel className="h-fit">
          <PanelHeader title={`Vault · ${documents.length}`} />
          {documents.length === 0 ? (
            <EmptyState
              icon={<FileText size={20} />}
              title="Nothing uploaded"
              description="Upload a sample document to start the pipeline."
            />
          ) : (
            <ul className="divide-y divide-ink-700">
              {documents.map((doc) => {
                const active = selected?.id === doc.id;
                return (
                  <li key={doc.id}>
                    <button
                      onClick={() => {
                        onSelect(doc.id);
                        setPage(1);
                        setPane(doc.pages.length === 0 ? "pipeline" : "pages");
                      }}
                      className={cx(
                        "w-full px-4 py-3 text-left transition-colors",
                        active ? "bg-ink-800" : "hover:bg-ink-850",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cx(
                            "text-xs font-medium",
                            active ? "text-ink-100" : "text-ink-200",
                          )}
                        >
                          {documentTypeMeta(doc.docType).shortLabel}
                        </p>
                        <Badge tone={STATUS_TONE[doc.status]}>
                          {doc.status === "needs_review"
                            ? "review"
                            : doc.status}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-ink-500">
                        {doc.fileName}
                      </p>
                      <p className="mt-1 text-[10px] text-ink-600">
                        {doc.pageCount}pp ·{" "}
                        {(doc.sizeBytes / 1_048_576).toFixed(1)} MB ·{" "}
                        {doc.fields.length} fields
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {selected ? (
          <Panel>
            <div className="border-b border-ink-700 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink-100">
                    {documentTypeMeta(selected.docType).label}
                  </h2>
                  <p className="mt-1 truncate text-[11px] text-ink-500">
                    {selected.fileName}
                  </p>
                  <p className="mt-1.5 text-[11px] text-ink-400">
                    {documentTypeMeta(selected.docType).purpose}
                  </p>
                </div>
                <div className="text-right">
                  <ConfidenceBar value={selected.docTypeConfidence} />
                  <p className="mt-1 text-[10px] text-ink-600">
                    classification confidence
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-ink-500">
                <span>uploaded {formatDateTime(selected.uploadedAt)}</span>
                <span>by {selected.uploadedBy}</span>
                <span>version {selected.version}</span>
                <span className="font-mono">
                  sha256 {selected.sha256.slice(0, 12)}…
                </span>
                <span>
                  {formatPaise(
                    selected.usage.ocrCostPaise + selected.usage.llmCostPaise,
                  )}
                </span>
              </div>

              {selected.duplicateOfId ? (
                <p className="mt-3 rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-[11px] text-ink-300">
                  Blocked as a duplicate of a document already on this property.
                  The pipeline halted at the dedupe stage, before OCR, so nothing
                  was spent processing it and the property record is unchanged.
                </p>
              ) : null}

              <div className="mt-4 flex gap-1">
                {(["pages", "extraction", "pipeline"] as Pane[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPane(p)}
                    className={cx(
                      "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      pane === p
                        ? "bg-ink-800 text-ink-100"
                        : "text-ink-400 hover:bg-ink-850 hover:text-ink-200",
                    )}
                  >
                    {p === "pages"
                      ? `Pages (${selected.pages.length})`
                      : p === "extraction"
                        ? `Extraction (${selected.fields.length})`
                        : "Pipeline"}
                  </button>
                ))}
              </div>
            </div>

            {pane === "pages" ? (
              selected.pages.length === 0 ? (
                <EmptyState
                  title="No text yet"
                  description="OCR output appears here once the pipeline reaches the extraction stage."
                />
              ) : (
                <div>
                  <div className="flex items-center gap-1.5 border-b border-ink-700 px-5 py-2.5">
                    {selected.pages.map((p) => (
                      <button
                        key={p.page}
                        onClick={() => setPage(p.page)}
                        className={cx(
                          "rounded px-2.5 py-1 font-mono text-[11px] transition-colors",
                          activePage?.page === p.page
                            ? "bg-brand-500/20 text-brand-300"
                            : "text-ink-500 hover:bg-ink-800 hover:text-ink-300",
                        )}
                      >
                        p{p.page}
                      </button>
                    ))}
                    <span className="ml-auto text-[10px] text-ink-600">
                      OCR text layer
                    </span>
                  </div>
                  <pre className="max-h-[560px] overflow-auto px-5 py-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink-200">
                    {activePage
                      ? highlight(activePage.text, focusSnippet)
                      : null}
                  </pre>
                </div>
              )
            ) : null}

            {pane === "extraction" ? (
              selected.fields.length === 0 ? (
                <EmptyState
                  title="No fields extracted"
                  description="Fields appear once the extraction stage completes."
                />
              ) : (
                <ul className="divide-y divide-ink-700">
                  {selected.fields.map((field) => (
                    <li key={field.key} className="px-5 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] text-ink-400">
                            {field.label}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-ink-100">
                            {effectiveValue(field)}
                          </p>
                          {field.humanValue &&
                          field.humanValue !== field.aiValue ? (
                            <p className="mt-1 text-[10px] text-ink-500">
                              machine read{" "}
                              <span className="line-through">
                                {field.aiValue}
                              </span>{" "}
                              · corrected by {field.reviewedBy}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <ConfidenceBar value={field.aiConfidence} />
                          <Badge
                            tone={
                              field.status === "corrected"
                                ? "graph"
                                : field.status === "approved"
                                  ? "verified"
                                  : "attention"
                            }
                          >
                            {field.status}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setPane("pages");
                          setPage(field.evidence.page);
                        }}
                        className="mt-2 block w-full rounded border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-left font-mono text-[10px] leading-relaxed text-ink-400 hover:border-ink-600 hover:text-ink-300"
                      >
                        p{field.evidence.page} · {field.evidence.snippet}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}

            {pane === "pipeline" ? (
              <PipelineView
                document={selected}
                canRetry={canEdit}
                onRetry={(stageId) => onRetry(selected.id, stageId)}
              />
            ) : null}
          </Panel>
        ) : (
          <Panel>
            <EmptyState
              icon={<FileText size={22} />}
              title="Select a document"
              description="Pick a document from the vault to read its pages, inspect the extraction, or follow the pipeline."
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
