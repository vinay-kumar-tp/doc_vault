"use client";

import {
  AlertTriangle,
  Check,
  CircleDashed,
  Cpu,
  Loader2,
  RotateCw,
  ScanLine,
  Shield,
} from "lucide-react";

import { Badge, Button, cx } from "@/components/ui";
import type { PipelineStageState, VaultDocument } from "@/domain/types";
import { formatPaise, stageSpec, type StageWorkload } from "@/sim/pipeline";

const WORKLOAD_ICON: Record<StageWorkload, typeof Shield> = {
  none: Shield,
  ocr: ScanLine,
  llm: Cpu,
};

const WORKLOAD_LABEL: Record<StageWorkload, string> = {
  none: "deterministic",
  ocr: "OCR provider",
  llm: "model call",
};

function durationOf(stage: PipelineStageState): string | null {
  if (!stage.startedAt || !stage.finishedAt) return null;
  const ms =
    new Date(stage.finishedAt).getTime() - new Date(stage.startedAt).getTime();
  if (ms <= 0) return null;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function PipelineView({
  document: doc,
  onRetry,
  canRetry,
}: {
  document: VaultDocument;
  onRetry?: (stageId: PipelineStageState["id"]) => void;
  canRetry: boolean;
}) {
  const halted = doc.status === "duplicate";
  const totalCost = doc.usage.ocrCostPaise + doc.usage.llmCostPaise;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 px-5 py-3">
        <Badge
          tone={
            doc.status === "ready"
              ? "verified"
              : doc.status === "needs_review"
                ? "attention"
                : doc.status === "failed"
                  ? "critical"
                  : doc.status === "duplicate"
                    ? "neutral"
                    : "brand"
          }
        >
          {doc.status.replace("_", " ")}
        </Badge>
        <span className="text-[11px] text-ink-500">
          {doc.usage.pagesProcessed} pages · {formatPaise(totalCost)} ·{" "}
          {doc.usage.llmTokensIn.toLocaleString("en-IN")} in /{" "}
          {doc.usage.llmTokensOut.toLocaleString("en-IN")} out
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink-600">
          {doc.usage.model} · {doc.usage.promptVersion}
        </span>
      </div>

      <ol className="px-5 py-3">
        {doc.stages.map((stage, index) => {
          const spec = stageSpec(stage.id);
          const Icon = WORKLOAD_ICON[spec.workload];
          const skipped = halted && stage.status === "pending";
          const duration = durationOf(stage);

          return (
            <li key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cx(
                    "mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    stage.status === "done" &&
                      "border-verified-500/50 bg-verified-500/15 text-verified-500",
                    stage.status === "running" &&
                      "border-brand-400/60 bg-brand-500/15 text-brand-300",
                    stage.status === "failed" &&
                      "border-critical-500/50 bg-critical-500/15 text-critical-500",
                    stage.status === "pending" &&
                      "border-ink-700 bg-ink-850 text-ink-600",
                  )}
                >
                  {stage.status === "done" ? (
                    <Check size={11} strokeWidth={3} />
                  ) : stage.status === "running" ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : stage.status === "failed" ? (
                    <AlertTriangle size={11} />
                  ) : (
                    <CircleDashed size={11} />
                  )}
                </span>
                {index < doc.stages.length - 1 ? (
                  <span
                    className={cx(
                      "my-1 w-px flex-1",
                      stage.status === "done" ? "bg-verified-500/30" : "bg-ink-700",
                    )}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cx(
                      "text-[13px] font-medium",
                      skipped ? "text-ink-600" : "text-ink-100",
                      stage.status === "running" && "text-brand-300",
                    )}
                  >
                    {stage.label}
                  </p>
                  <span
                    className="flex items-center gap-1 text-[10px] text-ink-500"
                    title={WORKLOAD_LABEL[spec.workload]}
                  >
                    <Icon size={10} />
                    {WORKLOAD_LABEL[spec.workload]}
                  </span>
                  {stage.attempts > 1 ? (
                    <Badge tone="attention">attempt {stage.attempts}</Badge>
                  ) : null}
                  {duration ? (
                    <span className="font-mono text-[10px] text-ink-600">
                      {duration}
                    </span>
                  ) : null}
                  {skipped ? (
                    <span className="text-[10px] text-ink-600">
                      not reached — run halted
                    </span>
                  ) : null}
                </div>

                {stage.status === "running" ? (
                  <div className="relative mt-2 h-0.5 w-40 overflow-hidden rounded-full bg-ink-700 anim-sweep" />
                ) : null}

                {stage.detail ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
                    {stage.detail}
                  </p>
                ) : (
                  <p
                    className={cx(
                      "mt-1 text-[11px] leading-relaxed",
                      skipped ? "text-ink-600" : "text-ink-500",
                    )}
                  >
                    {spec.purpose}
                  </p>
                )}

                {stage.error ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-critical-500/30 bg-critical-500/5 px-3 py-2">
                    <p className="text-[11px] text-critical-500">{stage.error}</p>
                    {canRetry && onRetry ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onRetry(stage.id)}
                      >
                        <RotateCw size={12} />
                        Retry this stage
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-ink-700 px-5 py-3 text-[11px] leading-relaxed text-ink-500">
        Retry re-runs one stage, not the document. That is the whole reason the
        pipeline is modelled as independent stages: an OCR provider timeout on
        page forty should not cost you the eleven stages that already succeeded.
      </p>
    </div>
  );
}
