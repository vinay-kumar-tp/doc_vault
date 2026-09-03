"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Badge,
  EmptyState,
  Panel,
  PanelHeader,
  cx,
  inputClass,
} from "@/components/ui";
import { documentTypeMeta } from "@/domain/document-types";
import { effectiveValue } from "@/domain/fields";
import { normaliseSurveyNumber, personNameKey } from "@/domain/normalize";
import { useVault } from "@/store/vault-store";

const EXAMPLES = [
  "42/3",
  "Sy. No. 118/2",
  "Vinay Kumar",
  "Lakshmamma",
  "BNG-1-04521",
  "Karnataka Gramin Bank",
  "kharab",
];

interface Hit {
  propertyId: string;
  propertyRef: string;
  propertyTitle: string;
  documentId: string;
  documentLabel: string;
  fileName: string;
  page: number;
  snippet: string;
  matchedOn: "page text" | "extracted field" | "identifier";
}

export default function SearchPage() {
  const { properties, documents } = useVault();
  const [query, setQuery] = useState("");

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim();
    if (q.length < 2) return [];

    const lower = q.toLowerCase();
    const surveyKey = normaliseSurveyNumber(q);
    const nameKey = personNameKey(q);
    const out: Hit[] = [];

    for (const property of properties) {
      const docs = documents.filter((d) => d.propertyId === property.id);
      for (const doc of docs) {
        const base = {
          propertyId: property.id,
          propertyRef: property.ref,
          propertyTitle: property.title,
          documentId: doc.id,
          documentLabel: documentTypeMeta(doc.docType).label,
          fileName: doc.fileName,
        };

        // Extracted fields first: a structured match is stronger than a text one.
        for (const field of doc.fields) {
          const value = effectiveValue(field);
          const valueLower = value.toLowerCase();
          const structural =
            valueLower.includes(lower) ||
            (surveyKey.length > 1 &&
              normaliseSurveyNumber(value) === surveyKey) ||
            (nameKey.length > 3 && personNameKey(value) === nameKey);
          if (!structural) continue;
          out.push({
            ...base,
            page: field.evidence.page,
            snippet: `${field.label}: ${value}`,
            matchedOn:
              valueLower.includes(lower) ? "extracted field" : "identifier",
          });
        }

        // Then raw page text.
        for (const page of doc.pages) {
          const at = page.text.toLowerCase().indexOf(lower);
          if (at < 0) continue;
          out.push({
            ...base,
            page: page.page,
            snippet: page.text
              .slice(Math.max(0, at - 80), at + 160)
              .replace(/\s+/g, " ")
              .trim(),
            matchedOn: "page text",
          });
        }
      }
    }

    return out.slice(0, 60);
  }, [query, properties, documents]);

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const hit of hits) {
      const bucket = map.get(hit.propertyId);
      if (bucket) bucket.push(hit);
      else map.set(hit.propertyId, [hit]);
    }
    return [...map.entries()];
  }, [hits]);

  return (
    <>
      <PageHeader
        eyebrow="Retrieval"
        title="Search"
        description="Searches extracted fields and full page text across every property. Identifiers are matched after normalisation, so 42-3 finds 42/3 and a trailing initial finds a leading one."
      />

      <div className="space-y-6 px-8 py-6">
        <Panel className="px-5 py-4">
          <div className="relative">
            <SearchIcon
              size={15}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-500"
            />
            <input
              className={cx(inputClass, "pl-9")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Survey number, owner name, registration number, any phrase…"
              aria-label="Search all properties"
              autoFocus
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="rounded border border-ink-700 bg-ink-850 px-2 py-1 font-mono text-[11px] text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-200"
              >
                {example}
              </button>
            ))}
          </div>
        </Panel>

        {query.trim().length < 2 ? (
          <Panel>
            <EmptyState
              icon={<SearchIcon size={22} />}
              title="Start typing"
              description="Two characters is enough. Try a survey number written the wrong way round to see normalisation working."
            />
          </Panel>
        ) : hits.length === 0 ? (
          <Panel>
            <EmptyState
              title={`Nothing matched "${query}"`}
              description="No extracted field and no page in any document contains this. Nothing is inferred to fill the gap."
            />
          </Panel>
        ) : (
          <>
            <p className="text-xs text-ink-400">
              {hits.length} match{hits.length === 1 ? "" : "es"} across{" "}
              {grouped.length} propert{grouped.length === 1 ? "y" : "ies"}
            </p>
            {grouped.map(([propertyId, propertyHits]) => {
              const first = propertyHits[0];
              if (!first) return null;
              return (
                <Panel key={propertyId}>
                  <PanelHeader
                    title={
                      <Link
                        href={`/properties/${propertyId}`}
                        className="hover:text-brand-300"
                      >
                        <span className="font-mono text-[11px] text-ink-500">
                          {first.propertyRef}
                        </span>{" "}
                        {first.propertyTitle}
                      </Link>
                    }
                    subtitle={`${propertyHits.length} match${propertyHits.length === 1 ? "" : "es"}`}
                  />
                  <ul className="divide-y divide-ink-700">
                    {propertyHits.map((hit, index) => (
                      <li
                        key={`${hit.documentId}-${hit.page}-${index}`}
                        className="px-5 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/properties/${hit.propertyId}`}
                            className="text-[11px] font-medium text-brand-300 hover:text-brand-400"
                          >
                            {hit.documentLabel} · page {hit.page}
                          </Link>
                          <Badge
                            tone={
                              hit.matchedOn === "page text" ? "neutral" : "brand"
                            }
                          >
                            {hit.matchedOn}
                          </Badge>
                          <span className="truncate text-[10px] text-ink-600">
                            {hit.fileName}
                          </span>
                        </div>
                        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink-300">
                          {hit.snippet}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
