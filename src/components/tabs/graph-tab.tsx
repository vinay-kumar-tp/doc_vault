"use client";

import { useMemo, useState } from "react";

import {
  Disclaimer,
  EmptyState,
  KeyValue,
  Panel,
  PanelHeader,
} from "@/components/ui";
import { documentTypeMeta } from "@/domain/document-types";
import { NODE_KIND_LABEL, layoutGraph } from "@/domain/graph";
import type {
  GraphNodeKind,
  PropertyGraph,
  VaultDocument,
} from "@/domain/types";

const WIDTH = 900;
const HEIGHT = 620;

const KIND_FILL: Record<GraphNodeKind, string> = {
  property: "#4c7dff",
  person: "#a06cf5",
  document: "#2a3242",
  survey_number: "#2fbf71",
  khata: "#e8a33d",
  office: "#3b4557",
  bank: "#e5544b",
  village: "#3b4557",
};

const KIND_RADIUS: Record<GraphNodeKind, number> = {
  property: 30,
  person: 20,
  document: 16,
  survey_number: 16,
  khata: 16,
  office: 15,
  bank: 16,
  village: 14,
};

export function GraphTab({
  graph,
  documents,
}: {
  graph: PropertyGraph;
  documents: VaultDocument[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverEdgeId, setHoverEdgeId] = useState<string | null>(null);

  const positions = useMemo(
    () => layoutGraph(graph, WIDTH, HEIGHT),
    [graph],
  );

  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;
  const connected = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.from === selectedId) set.add(edge.to);
      if (edge.to === selectedId) set.add(edge.from);
    }
    return set;
  }, [graph.edges, selectedId]);

  const kindCounts = useMemo(() => {
    const counts = new Map<GraphNodeKind, number>();
    for (const node of graph.nodes) {
      counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [graph.nodes]);

  const selectedEdges = graph.edges.filter(
    (e) => e.from === selectedId || e.to === selectedId,
  );

  if (graph.nodes.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="No graph yet"
          description="Nodes and edges are written once documents have been processed and their entities resolved."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Property graph"
            subtitle="Every node and edge carries the documents that assert it. Click a node to see what is claiming it exists."
            action={
              <span className="text-[11px] text-ink-500">
                {graph.nodes.length} nodes · {graph.edges.length} edges
              </span>
            }
          />
          <div className="overflow-x-auto bg-ink-950/40">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-auto w-full min-w-[720px]"
              role="img"
              aria-label="Property knowledge graph"
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b4557" />
                </marker>
              </defs>

              {graph.edges.map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                if (!from || !to) return null;
                const active =
                  hoverEdgeId === edge.id ||
                  edge.from === selectedId ||
                  edge.to === selectedId;
                const dimmed = selectedId !== null && !active;

                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;

                return (
                  <g
                    key={edge.id}
                    onMouseEnter={() => setHoverEdgeId(edge.id)}
                    onMouseLeave={() => setHoverEdgeId(null)}
                  >
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={active ? "#6f96ff" : "#1c2230"}
                      strokeWidth={active ? 1.8 : 1}
                      opacity={dimmed ? 0.25 : 1}
                      markerEnd="url(#arrow)"
                    />
                    {active ? (
                      <text
                        x={midX}
                        y={midY - 5}
                        textAnchor="middle"
                        className="fill-brand-300"
                        style={{ fontSize: 9, fontFamily: "ui-monospace" }}
                      >
                        {edge.kind}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {graph.nodes.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;
                const isSelected = node.id === selectedId;
                const isConnected = connected.has(node.id);
                const dimmed = selectedId !== null && !isSelected && !isConnected;
                const r = KIND_RADIUS[node.kind];

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    opacity={dimmed ? 0.3 : 1}
                    onClick={() =>
                      setSelectedId(isSelected ? null : node.id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      r={r}
                      fill={KIND_FILL[node.kind]}
                      fillOpacity={node.kind === "document" ? 1 : 0.22}
                      stroke={KIND_FILL[node.kind]}
                      strokeWidth={isSelected ? 2.5 : 1.4}
                    />
                    <text
                      y={r + 13}
                      textAnchor="middle"
                      className="fill-ink-200"
                      style={{ fontSize: 10.5, fontWeight: 500 }}
                    >
                      {node.label.length > 26
                        ? `${node.label.slice(0, 25)}…`
                        : node.label}
                    </text>
                    {node.sublabel ? (
                      <text
                        y={r + 25}
                        textAnchor="middle"
                        className="fill-ink-500"
                        style={{ fontSize: 9 }}
                      >
                        {node.sublabel.length > 30
                          ? `${node.sublabel.slice(0, 29)}…`
                          : node.sublabel}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-ink-700 px-5 py-3">
            {kindCounts.map(([kind, count]) => (
              <span
                key={kind}
                className="flex items-center gap-1.5 text-[11px] text-ink-400"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: KIND_FILL[kind] }}
                />
                {NODE_KIND_LABEL[kind]} · {count}
              </span>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title={selected ? selected.label : "Select a node"}
              subtitle={
                selected
                  ? NODE_KIND_LABEL[selected.kind]
                  : "Click any node in the graph to inspect it."
              }
            />
            {selected ? (
              <div className="space-y-4 px-5 py-4">
                {selected.sublabel ? (
                  <p className="text-xs text-ink-300">{selected.sublabel}</p>
                ) : null}

                <div>
                  <p className="mb-2 text-[10px] font-medium tracking-wide text-ink-500 uppercase">
                    Asserted by
                  </p>
                  <ul className="space-y-1.5">
                    {selected.sourceDocumentIds.map((id) => {
                      const doc = documents.find((d) => d.id === id);
                      return (
                        <li
                          key={id}
                          className="rounded border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-[11px] text-ink-300"
                        >
                          {doc
                            ? documentTypeMeta(doc.docType).label
                            : `Document ${id}`}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-medium tracking-wide text-ink-500 uppercase">
                    Relationships
                  </p>
                  <ul className="space-y-1.5">
                    {selectedEdges.map((edge) => {
                      const otherId =
                        edge.from === selected.id ? edge.to : edge.from;
                      const other = graph.nodes.find((n) => n.id === otherId);
                      const outbound = edge.from === selected.id;
                      return (
                        <li
                          key={edge.id}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-ink-400">
                            <span className="font-mono text-brand-300">
                              {outbound ? "→" : "←"} {edge.kind}
                            </span>{" "}
                            {other?.label ?? otherId}
                          </span>
                          <span className="font-mono text-[10px] text-ink-600">
                            {Math.round(edge.confidence * 100)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4">
                <KeyValue
                  rows={[
                    { label: "Nodes", value: graph.nodes.length },
                    { label: "Edges", value: graph.edges.length },
                    {
                      label: "People resolved",
                      value: graph.nodes.filter((n) => n.kind === "person").length,
                    },
                    {
                      label: "Lenders",
                      value: graph.nodes.filter((n) => n.kind === "bank").length,
                    },
                  ]}
                />
              </div>
            )}
          </Panel>

          <Panel className="px-5 py-4">
            <h3 className="text-xs font-semibold text-ink-100">
              Why a graph rather than folders
            </h3>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
              &ldquo;Vinay Kumar S.&rdquo; on the sale deed and &ldquo;S. VINAY
              KUMAR&rdquo; on the khata collapse to a single person node, because
              the name key is computed after normalisation and a leading initial
              is the same fact as a trailing one. Ownership becomes something you
              can traverse rather than something a human infers by reading three
              PDFs side by side.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
              The tax roll reads &ldquo;VINAY KUMAR&rdquo; with no initial at all.
              That is close but not equivalent, so it deliberately stays a{" "}
              <span className="text-attention-500">separate node</span> and
              surfaces as a name variant finding. Silently merging two people is a
              worse failure than asking a human to confirm.
            </p>
          </Panel>
        </div>
      </div>

      <Disclaimer>
        Graph edges reflect what documents assert, with the confidence of the
        extraction that produced them. An edge is not a finding of fact.
      </Disclaimer>
    </div>
  );
}
