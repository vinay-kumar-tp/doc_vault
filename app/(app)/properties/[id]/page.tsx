"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge, Panel, cx } from "@/components/ui";
import { AssistantTab } from "@/components/tabs/assistant-tab";
import { ComplianceTab } from "@/components/tabs/compliance-tab";
import { DocumentsTab } from "@/components/tabs/documents-tab";
import { GraphTab } from "@/components/tabs/graph-tab";
import { OverviewTab } from "@/components/tabs/overview-tab";
import { ReviewTab } from "@/components/tabs/review-tab";
import { ShareTab } from "@/components/tabs/share-tab";
import { TimelineTab } from "@/components/tabs/timeline-tab";
import { READINESS_COPY, readinessBand } from "@/domain/compliance";
import { unreviewedFieldCount } from "@/domain/fields";
import { PROPERTY_KIND_LABEL } from "@/domain/rules";
import { useVault } from "@/store/vault-store";

type TabId =
  | "overview"
  | "documents"
  | "review"
  | "timeline"
  | "graph"
  | "compliance"
  | "assistant"
  | "share";

export default function PropertyWorkspacePage() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;

  const {
    propertyById,
    documentsFor,
    reportFor,
    timelineFor,
    graphFor,
    sharesFor,
    currentUser,
    uploadSample,
    retryStage,
    reviewField,
    reopenField,
    createShare,
    revokeShare,
    askAssistant,
    clearAssistant,
    assistantTurns,
    samples,
  } = useVault();

  const [tab, setTab] = useState<TabId>("overview");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [focusPage, setFocusPage] = useState<number | null>(null);
  const [focusSnippet, setFocusSnippet] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const property = propertyById(propertyId);
  const documents = useMemo(
    () => documentsFor(propertyId),
    [documentsFor, propertyId],
  );
  const report = reportFor(propertyId);
  const timeline = useMemo(
    () => timelineFor(propertyId),
    [timelineFor, propertyId],
  );
  const graph = useMemo(() => graphFor(propertyId), [graphFor, propertyId]);
  const shares = useMemo(() => sharesFor(propertyId), [sharesFor, propertyId]);
  const turns = assistantTurns(propertyId);
  const askThis = useMemo(
    () => askAssistant(propertyId),
    [askAssistant, propertyId],
  );

  const canEdit = currentUser?.role !== "buyer";

  const openDocument = useCallback(
    (documentId: string, page: number, snippet?: string) => {
      setSelectedDocId(documentId);
      setFocusPage(page);
      setFocusSnippet(snippet ?? null);
      setFocusNonce((n) => n + 1);
      setTab("documents");
    },
    [],
  );

  if (!property || !report) {
    return (
      <div className="px-8 py-14">
        <Panel className="px-6 py-10 text-center">
          <p className="text-sm text-ink-200">Property not found</p>
          <p className="mt-1.5 text-xs text-ink-400">
            It may have been removed by a demo reset.
          </p>
          <Link
            href="/properties"
            className="mt-4 inline-block text-xs font-medium text-brand-300 hover:text-brand-400"
          >
            Back to properties
          </Link>
        </Panel>
      </div>
    );
  }

  const band = readinessBand(report);
  const pending = unreviewedFieldCount(documents);
  const criticalCount = report.findings.filter(
    (f) => f.severity === "critical",
  ).length;

  const TABS: { id: TabId; label: string; count?: number; tone?: "critical" | "attention" }[] = [
    { id: "overview", label: "Overview" },
    { id: "documents", label: "Documents", count: documents.length },
    {
      id: "review",
      label: "Review",
      count: pending || undefined,
      tone: pending > 0 ? "attention" : undefined,
    },
    { id: "timeline", label: "Timeline", count: timeline.length },
    { id: "graph", label: "Graph", count: graph.nodes.length },
    {
      id: "compliance",
      label: "Findings",
      count: report.findings.length || undefined,
      tone: criticalCount > 0 ? "critical" : undefined,
    },
    { id: "assistant", label: "Assistant" },
    { id: "share", label: "Sharing", count: shares.length || undefined },
  ];

  return (
    <>
      <PageHeader
        eyebrow={property.ref}
        title={property.title}
        description={
          <>
            {PROPERTY_KIND_LABEL[property.kind]} · {property.address.line1},{" "}
            {property.address.locality}, {property.address.city}{" "}
            {property.address.pincode}
          </>
        }
        action={
          <div className="flex flex-col items-end gap-2">
            <Badge
              tone={
                band === "blocked"
                  ? "critical"
                  : band === "review"
                    ? "attention"
                    : "verified"
              }
            >
              {READINESS_COPY[band].label}
            </Badge>
            <Link
              href="/properties"
              className="flex items-center gap-1 text-[11px] text-ink-400 hover:text-ink-200"
            >
              <ArrowLeft size={12} />
              All properties
            </Link>
          </div>
        }
      />

      <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-ink-700 bg-ink-950/90 px-8 py-2 backdrop-blur">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cx(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === item.id
                ? "bg-ink-800 text-ink-100"
                : "text-ink-400 hover:bg-ink-850 hover:text-ink-200",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cx(
                  "rounded px-1.5 py-0.5 font-mono text-[10px]",
                  item.tone === "critical"
                    ? "bg-critical-500/15 text-critical-500"
                    : item.tone === "attention"
                      ? "bg-attention-500/15 text-attention-500"
                      : "bg-ink-700 text-ink-400",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="px-8 py-6">
        {tab === "overview" ? (
          <OverviewTab
            property={property}
            documents={documents}
            report={report}
            onOpenDocument={openDocument}
            onGoToFindings={() => setTab("compliance")}
          />
        ) : null}

        {tab === "documents" ? (
          <DocumentsTab
            documents={documents}
            propertyId={propertyId}
            selectedId={selectedDocId}
            focusPage={focusPage}
            focusSnippet={focusSnippet}
            focusNonce={focusNonce}
            onSelect={(id) => {
              setSelectedDocId(id);
              setFocusSnippet(null);
            }}
            onUpload={(sampleId) => {
              const id = uploadSample(propertyId, sampleId);
              if (id) setSelectedDocId(id);
            }}
            onRetry={retryStage}
            canEdit={canEdit}
            samples={samples}
          />
        ) : null}

        {tab === "review" ? (
          <ReviewTab
            documents={documents}
            canEdit={canEdit}
            onApprove={(docId, key) => reviewField(docId, key, null)}
            onCorrect={(docId, key, value) => reviewField(docId, key, value)}
            onReopen={reopenField}
            onOpenEvidence={(docId, page, snippet) =>
              openDocument(docId, page, snippet)
            }
          />
        ) : null}

        {tab === "timeline" ? (
          <TimelineTab
            events={timeline}
            documents={documents}
            onOpenDocument={openDocument}
          />
        ) : null}

        {tab === "graph" ? (
          <GraphTab graph={graph} documents={documents} />
        ) : null}

        {tab === "compliance" ? (
          <ComplianceTab
            property={property}
            report={report}
            documents={documents}
            onOpenDocument={openDocument}
          />
        ) : null}

        {tab === "assistant" ? (
          <AssistantTab
            turns={turns}
            documents={documents}
            onAsk={askThis}
            onClear={() => clearAssistant(propertyId)}
            onOpenDocument={(docId, page, snippet) =>
              openDocument(docId, page, snippet)
            }
          />
        ) : null}

        {tab === "share" ? (
          <ShareTab
            shares={shares}
            canShare={canEdit}
            onCreate={(audience, scopes, ttlHours) =>
              createShare(propertyId, audience, scopes, ttlHours)
            }
            onRevoke={revokeShare}
          />
        ) : null}
      </div>
    </>
  );
}
