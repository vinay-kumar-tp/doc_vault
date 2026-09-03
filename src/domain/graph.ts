import { documentTypeMeta } from "./document-types";
import { activeDocuments, collectField, fieldValue } from "./fields";
import { parseEcEntries } from "./timeline";
import {
  displayPersonName,
  normaliseIdentifier,
  normaliseSurveyNumber,
  personNameKey,
} from "./normalize";
import type {
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
  Property,
  PropertyGraph,
  VaultDocument,
} from "./types";

/**
 * Property graph construction.
 *
 * Nodes are canonical entities, so the same person named three different ways
 * across three documents collapses to one node keyed by `personNameKey`. That
 * collapse is what turns a folder of PDFs into something you can traverse.
 *
 * Every node and edge carries the document IDs that assert it. An edge with no
 * source document is not created, which keeps the graph auditable: you can
 * always ask "which page says this?".
 */

class GraphBuilder {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();

  node(
    kind: GraphNodeKind,
    key: string,
    label: string,
    sourceDocumentIds: string[],
    sublabel?: string,
  ): string {
    const id = `${kind}:${key}`;
    const existing = this.nodes.get(id);
    if (existing) {
      for (const docId of sourceDocumentIds) {
        if (!existing.sourceDocumentIds.includes(docId)) {
          existing.sourceDocumentIds.push(docId);
        }
      }
      return id;
    }
    this.nodes.set(id, {
      id,
      kind,
      label,
      sublabel,
      sourceDocumentIds: [...sourceDocumentIds],
    });
    return id;
  }

  edge(
    from: string,
    to: string,
    kind: GraphEdgeKind,
    label: string,
    sourceDocumentIds: string[],
    confidence: number,
  ): void {
    if (from === to) return;
    const id = `${from}->${to}:${kind}`;
    const existing = this.edges.get(id);
    if (existing) {
      for (const docId of sourceDocumentIds) {
        if (!existing.sourceDocumentIds.includes(docId)) {
          existing.sourceDocumentIds.push(docId);
        }
      }
      existing.confidence = Math.max(existing.confidence, confidence);
      return;
    }
    this.edges.set(id, {
      id,
      from,
      to,
      kind,
      label,
      sourceDocumentIds: [...sourceDocumentIds],
      confidence,
    });
  }

  build(): PropertyGraph {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()] };
  }
}

/** Splits "Ramachandrappa K. B.; Lalitha A." and "A and B" into separate people. */
function splitParties(raw: string): string[] {
  return raw
    .split(/;|\band\b|&/i)
    .map((s) => displayPersonName(s))
    .map((s) => s.replace(/\bothers\b/i, "").trim())
    .filter((s) => s.length > 2);
}

export function buildPropertyGraph(
  property: Property,
  allDocs: VaultDocument[],
): PropertyGraph {
  const docs = activeDocuments(allDocs).filter(
    (d) => d.status === "ready" || d.status === "needs_review",
  );
  const b = new GraphBuilder();

  const allDocIds = docs.map((d) => d.id);
  const propertyNode = b.node(
    "property",
    property.id,
    property.ref,
    allDocIds,
    property.title,
  );

  // Documents hang off the property.
  for (const doc of docs) {
    const docNode = b.node(
      "document",
      doc.id,
      documentTypeMeta(doc.docType).shortLabel,
      [doc.id],
      doc.fileName,
    );
    b.edge(
      propertyNode,
      docNode,
      "HAS_DOCUMENT",
      "has document",
      [doc.id],
      doc.docTypeConfidence,
    );

    // Survey number the document points at.
    const survey = fieldValue(doc, "survey_number");
    if (survey) {
      const canonical = normaliseSurveyNumber(survey);
      const surveyNode = b.node(
        "survey_number",
        canonical,
        `Sy. No. ${canonical}`,
        [doc.id],
        fieldValue(doc, "village"),
      );
      b.edge(docNode, surveyNode, "REFERENCES", "references", [doc.id], 0.95);
      b.edge(
        propertyNode,
        surveyNode,
        "LOCATED_IN",
        "located in",
        [doc.id],
        0.9,
      );
    }

    // Village / hobli.
    const village = fieldValue(doc, "village");
    if (village) {
      const villageNode = b.node(
        "village",
        normaliseIdentifier(village),
        village,
        [doc.id],
      );
      b.edge(
        propertyNode,
        villageNode,
        "LOCATED_IN",
        "located in",
        [doc.id],
        0.9,
      );
    }

    // Sub-Registrar / issuing office.
    const office = fieldValue(doc, "sro") ?? fieldValue(doc, "issuing_office");
    if (office) {
      const officeNode = b.node(
        "office",
        normaliseIdentifier(office),
        office.split(",")[0] ?? office,
        [doc.id],
        "Sub-Registrar Office",
      );
      b.edge(
        docNode,
        officeNode,
        "REGISTERED_AT",
        "registered at",
        [doc.id],
        0.93,
      );
    }

    // Khata.
    const khata = fieldValue(doc, "khata_number");
    if (khata) {
      const khataNode = b.node(
        "khata",
        normaliseIdentifier(khata),
        `Khata ${khata}`,
        [doc.id],
        fieldValue(doc, "khata_class"),
      );
      b.edge(propertyNode, khataNode, "HAS_KHATA", "has khata", [doc.id], 0.94);
    }
  }

  // People, and the transfers between them.
  for (const doc of docs) {
    const docNode = `document:${doc.id}`;

    const vendorRaw = fieldValue(doc, "vendor_name");
    const purchaserRaw = fieldValue(doc, "purchaser_name");

    const vendors = vendorRaw ? splitParties(vendorRaw) : [];
    const purchasers = purchaserRaw ? splitParties(purchaserRaw) : [];

    const vendorNodes = vendors.map((name) =>
      b.node("person", personNameKey(name), name, [doc.id]),
    );
    const purchaserNodes = purchasers.map((name) =>
      b.node("person", personNameKey(name), name, [doc.id]),
    );

    for (const from of vendorNodes) {
      for (const to of purchaserNodes) {
        b.edge(from, to, "SOLD_TO", "sold to", [doc.id], 0.95);
      }
    }
    for (const person of [...vendorNodes, ...purchaserNodes]) {
      b.edge(person, docNode, "REFERENCES", "party to", [doc.id], 0.95);
    }
  }

  // Present owner, from the municipal / revenue record where available,
  // otherwise the most recent purchaser.
  const ownerOccurrences = [
    ...collectField(docs, "owner_name"),
    ...collectField(docs, "latest_owner"),
  ];
  if (ownerOccurrences.length > 0) {
    for (const occ of ownerOccurrences) {
      for (const name of splitParties(occ.value)) {
        const personNode = b.node("person", personNameKey(name), name, [
          occ.document.id,
        ]);
        b.edge(
          personNode,
          propertyNode,
          "OWNS",
          "owns",
          [occ.document.id],
          occ.field.aiConfidence,
        );
      }
    }
  }

  // Lenders, from EC mortgage entries and from revenue-record charge notes.
  for (const doc of docs) {
    if (doc.docType === "encumbrance_certificate") {
      for (const entry of parseEcEntries(doc)) {
        // A release or discharge mentions "mortgage" but its claimant is the
        // borrower getting the charge lifted, not a lender taking one. Reading
        // it as a lender put the property owners in the graph as banks.
        if (!/MORTGAGE/i.test(entry.nature)) continue;
        if (/RELEASE|DISCHARGE|SATISFACTION/i.test(entry.nature)) continue;
        const lender = entry.claimant;
        if (!lender) continue;
        const bankNode = b.node(
          "bank",
          normaliseIdentifier(lender),
          lender.split(",")[0] ?? lender,
          [doc.id],
          entry.amount,
        );
        b.edge(
          propertyNode,
          bankNode,
          "HAS_LOAN",
          `charge · ${entry.documentNumber ?? entry.serial}`,
          [doc.id],
          0.9,
        );
      }
    }

    const revenueCharge = fieldValue(doc, "revenue_charge");
    if (revenueCharge) {
      const lender = revenueCharge.split("—")[0]?.trim() ?? revenueCharge;
      const bankNode = b.node(
        "bank",
        normaliseIdentifier(lender),
        lender,
        [doc.id],
        "noted in revenue record",
      );
      b.edge(
        propertyNode,
        bankNode,
        "HAS_LOAN",
        "charge noted in RTC",
        [doc.id],
        0.85,
      );
    }
  }

  return b.build();
}

export const NODE_KIND_LABEL: Record<GraphNodeKind, string> = {
  property: "Property",
  person: "Person",
  document: "Document",
  survey_number: "Survey number",
  khata: "Khata",
  office: "Registry office",
  bank: "Lender",
  village: "Village",
};

/** Deterministic radial layout. Property at the centre, kinds on rings. */
export function layoutGraph(
  graph: PropertyGraph,
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const centre = { x: width / 2, y: height / 2 };
  const positions = new Map<string, { x: number; y: number }>();

  const rings: Record<GraphNodeKind, number> = {
    property: 0,
    person: 0.42,
    document: 0.72,
    survey_number: 0.95,
    khata: 0.95,
    office: 0.95,
    bank: 0.95,
    village: 0.95,
  };

  const byRing = new Map<number, GraphNode[]>();
  for (const node of graph.nodes) {
    const ring = rings[node.kind];
    const bucket = byRing.get(ring);
    if (bucket) bucket.push(node);
    else byRing.set(ring, [node]);
  }

  const maxRadius = Math.min(width, height) / 2 - 46;

  for (const [ring, nodes] of byRing) {
    if (ring === 0) {
      for (const node of nodes) positions.set(node.id, centre);
      continue;
    }
    const radius = maxRadius * ring;
    // Offset each ring so labels on adjacent rings do not stack vertically.
    const offset = ring * Math.PI * 0.65;
    nodes.forEach((node, index) => {
      const angle = offset + (index / nodes.length) * Math.PI * 2;
      positions.set(node.id, {
        x: centre.x + Math.cos(angle) * radius,
        y: centre.y + Math.sin(angle) * radius * 0.82,
      });
    });
  }

  return positions;
}
