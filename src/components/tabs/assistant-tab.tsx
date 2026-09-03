"use client";

import { useState } from "react";
import { ArrowUp, Ban, FileText, Sparkles, Trash2 } from "lucide-react";

import {
  Badge,
  Button,
  Disclaimer,
  Panel,
  PanelHeader,
  cx,
  inputClass,
} from "@/components/ui";
import { SUGGESTED_QUESTIONS, TOOLS } from "@/domain/assistant";
import { documentTypeMeta } from "@/domain/document-types";
import type { AssistantTurn, VaultDocument } from "@/domain/types";

export function AssistantTab({
  turns,
  documents,
  onAsk,
  onClear,
  onOpenDocument,
}: {
  turns: AssistantTurn[];
  documents: VaultDocument[];
  onAsk: (question: string) => void;
  onClear: () => void;
  onOpenDocument: (documentId: string, page: number, snippet: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(question: string) {
    const q = question.trim();
    if (q.length === 0) return;
    onAsk(q);
    setDraft("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel className="flex min-h-[520px] flex-col">
        <PanelHeader
          title="Ask about this property"
          subtitle="Questions are answered from the structured record, and every answer cites the page it came from."
          action={
            turns.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={onClear}>
                <Trash2 size={13} />
                Clear
              </Button>
            ) : null
          }
        />

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {turns.length === 0 ? (
            <div className="py-8 text-center">
              <Sparkles size={22} className="mx-auto mb-3 text-ink-600" />
              <p className="text-sm font-medium text-ink-200">
                Nothing asked yet
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-400">
                Try one of the suggestions. The last one deliberately asks for a
                legal conclusion, so you can see the assistant decline instead of
                obliging.
              </p>
            </div>
          ) : (
            turns.map((turn) => (
              <div key={turn.id} className="anim-fade-up space-y-2.5">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-500/15 px-3.5 py-2 text-xs text-ink-100">
                    {turn.question}
                  </p>
                </div>

                {turn.kind === "rejected" ? (
                  <div className="rounded-2xl rounded-bl-sm border border-attention-500/30 bg-attention-500/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Ban size={13} className="text-attention-500" />
                      <p className="text-[11px] font-medium text-attention-500">
                        Declined — no answer without evidence
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-300">
                      {turn.reason}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl rounded-bl-sm border border-ink-700 bg-ink-850 px-4 py-3">
                    <p className="text-xs leading-relaxed text-ink-100">
                      {turn.answer}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone="verified">
                        confidence {Math.round(turn.confidence * 100)}%
                      </Badge>
                      {turn.toolsUsed.map((tool) => (
                        <span
                          key={tool}
                          className="rounded border border-ink-700 bg-ink-900 px-1.5 py-0.5 font-mono text-[10px] text-ink-500"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 border-t border-ink-700 pt-3">
                      <p className="mb-2 text-[10px] font-medium tracking-wide text-ink-500 uppercase">
                        Evidence · {turn.citations.length}
                      </p>
                      <ul className="space-y-1.5">
                        {turn.citations.map((citation, index) => (
                          <li key={`${citation.documentId}-${citation.page}-${index}`}>
                            <button
                              onClick={() =>
                                onOpenDocument(
                                  citation.documentId,
                                  citation.page,
                                  citation.snippet,
                                )
                              }
                              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-left transition-colors hover:border-ink-600"
                            >
                              <span className="flex items-center gap-1.5 text-[10px] font-medium text-brand-300">
                                <FileText size={10} />
                                {citation.documentLabel} · page {citation.page}
                              </span>
                              <span className="mt-1 block font-mono text-[10px] leading-relaxed text-ink-400">
                                {citation.snippet}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-ink-700 p-4">
          <div className="flex gap-2">
            <input
              className={cx(inputClass, "flex-1")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit(draft);
              }}
              placeholder="Ask about owners, charges, extent, missing documents…"
              aria-label="Ask a question about this property"
            />
            <Button
              variant="primary"
              onClick={() => submit(draft)}
              disabled={draft.trim().length === 0}
            >
              <ArrowUp size={15} />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                onClick={() => submit(question)}
                className="rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-left text-[11px] text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel className="px-5 py-4">
          <h3 className="text-xs font-semibold text-ink-100">
            How an answer is produced
          </h3>
          <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-ink-400">
            {[
              "Intent detection routes the question.",
              "A planner selects read-only query tools.",
              "Tools return already-validated structured data.",
              "An evidence builder collects page-level citations.",
              "The answer is assembled from that evidence only.",
              "An answer with zero citations is converted to a refusal.",
            ].map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-mono text-ink-600">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 border-t border-ink-700 pt-3 text-[11px] leading-relaxed text-ink-500">
            The reasoning layer has no database access. It can only call the tools
            below, so there is no path by which it can invent a fact that no
            document supports.
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {TOOLS.map((tool) => (
              <span
                key={tool}
                className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-ink-400"
              >
                {tool}
              </span>
            ))}
          </div>
        </Panel>

        <Panel className="px-5 py-4">
          <h3 className="text-xs font-semibold text-ink-100">
            Documents in scope
          </h3>
          <ul className="mt-2.5 space-y-1.5">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="truncate text-ink-300">
                  {documentTypeMeta(doc.docType).shortLabel}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-ink-600">
                  {doc.pageCount}pp
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Disclaimer>
          The assistant describes documents. It does not advise on whether to
          transact, and it will refuse questions that ask it to.
        </Disclaimer>
      </div>
    </div>
  );
}
