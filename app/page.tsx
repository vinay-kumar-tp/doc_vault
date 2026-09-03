"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileSearch,
  GitBranch,
  ScanLine,
  ShieldCheck,
  Layers,
} from "lucide-react";

import { Badge, Button, Panel, cx } from "@/components/ui";
import { useVault } from "@/store/vault-store";
import type { Role } from "@/domain/types";

const ROLE_ACCENT: Record<Role, string> = {
  owner: "border-brand-500/50 hover:border-brand-400",
  lawyer: "border-graph-500/50 hover:border-graph-500",
  buyer: "border-verified-500/50 hover:border-verified-500",
};

const ROLE_LABEL: Record<Role, string> = {
  owner: "Property owner",
  lawyer: "Property lawyer",
  buyer: "Prospective buyer",
};

const PILLARS = [
  {
    icon: ScanLine,
    title: "Documents become structured data",
    body: "OCR, layout analysis and typed extraction turn a scanned sale deed into fields that carry a page reference and a confidence score.",
  },
  {
    icon: GitBranch,
    title: "Structured data becomes a graph",
    body: "The same person named three ways across three documents collapses into one node. Ownership becomes traversable instead of implied.",
  },
  {
    icon: FileSearch,
    title: "The graph produces findings",
    body: "Deterministic rules compare documents against each other and against a versioned checklist. Every finding cites the page it came from.",
  },
  {
    icon: ShieldCheck,
    title: "Findings stop short of legal advice",
    body: "The platform states what the documents say and where they disagree. Whether title is good remains a lawyer's call, by design.",
  },
];

export default function LandingPage() {
  const { users, signIn } = useVault();
  const router = useRouter();

  function enter(userId: string) {
    signIn(userId);
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
          <Layers size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Real Estate Vault</p>
          <p className="text-[11px] text-ink-400">
            Property intelligence · Karnataka · demo simulation
          </p>
        </div>
      </div>

      <div className="mt-14 max-w-3xl">
        <Badge tone="brand">Pre-MVP walkthrough</Badge>
        <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-ink-100 sm:text-5xl">
          Every property deserves one trusted digital record.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-300">
          A Bengaluru property transaction can involve eighty documents spread
          across a lawyer&apos;s inbox, a broker&apos;s WhatsApp and a shoebox of
          photocopies. Storing them is not the problem. Nobody has a single
          structured view of what they collectively say about the property.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink-300">
          This walkthrough runs the whole pipeline end to end on synthetic
          Karnataka documents — sale deeds, Form 15 and Form 16 encumbrance
          certificates, e-Khata extracts, RTC Pahani records and BBMP tax
          receipts.
        </p>
      </div>

      <section className="mt-14">
        <h2 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
          Choose a role to enter
        </h2>
        <p className="mt-2 text-xs text-ink-500">
          Roles differ in what they can change, not just what they can see. A
          buyer cannot alter the property record.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => enter(user.id)}
              className={cx(
                "group rounded-[14px] border bg-ink-900 p-5 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400",
                ROLE_ACCENT[user.role],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-100">{user.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {ROLE_LABEL[user.role]} · {user.organisation}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="mt-0.5 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-200"
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-400">
                {user.blurb}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
          What the product actually is
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <Panel key={pillar.title} className="p-5">
              <pillar.icon size={18} className="text-brand-400" />
              <h3 className="mt-3 text-sm font-semibold text-ink-100">
                {pillar.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                {pillar.body}
              </p>
            </Panel>
          ))}
        </div>
      </section>

      <Panel className="mt-12 p-5">
        <h2 className="text-sm font-semibold text-ink-100">
          What is simulated here
        </h2>
        <div className="mt-3 grid gap-6 text-xs leading-relaxed text-ink-400 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 font-medium text-verified-500">Real</p>
            <ul className="space-y-1">
              <li>The 13-stage pipeline, its ordering and per-stage retry</li>
              <li>Identifier normalisation and entity resolution bands</li>
              <li>Cross-document consistency checks</li>
              <li>Versioned, rule-based compliance evaluation</li>
              <li>Graph construction with source attribution</li>
              <li>The evidence-or-refuse contract on every answer</li>
              <li>Cost accounting per document</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5 font-medium text-attention-500">Simulated</p>
            <ul className="space-y-1">
              <li>OCR — page text is authored, not scanned</li>
              <li>Extraction — fields are pre-authored per sample document</li>
              <li>Answer prose — assembled from templates over real evidence</li>
              <li>Storage, auth and the database — all in browser memory</li>
              <li>Timings — stage durations are representative, not measured</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 border-t border-ink-700 pt-3 text-[11px] leading-relaxed text-ink-500">
          Every document in this demo is synthetic. Names, PANs, Aadhaar numbers,
          khata numbers and registration numbers are invented. Only the document
          structures and field vocabularies mirror real Karnataka instruments.
        </p>
      </Panel>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={() => enter("user-owner")}>
          Enter as the property owner
          <ArrowRight size={15} />
        </Button>
        <span className="text-xs text-ink-500">
          Start with RV-000002 if you want to see the problematic file.
        </span>
      </div>
    </main>
  );
}
