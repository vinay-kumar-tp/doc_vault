"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Eye, Link2, ShieldOff } from "lucide-react";

import {
  Badge,
  Button,
  Disclaimer,
  Field,
  Panel,
  PanelHeader,
  cx,
  inputClass,
} from "@/components/ui";
import { formatDateTime, relativeTime } from "@/domain/clock";
import type { ShareLink, ShareScope } from "@/domain/types";

const SCOPES: { id: ShareScope; label: string; description: string }[] = [
  {
    id: "summary:read",
    label: "Summary",
    description: "Property identity, reconciled facts, readiness band",
  },
  {
    id: "compliance:read",
    label: "Checklist & findings",
    description: "The due-diligence report and every finding",
  },
  {
    id: "documents:read",
    label: "Documents",
    description: "Page text and the extraction for each document",
  },
  {
    id: "timeline:read",
    label: "Timeline",
    description: "Registered transfers, encumbrances and payments",
  },
  {
    id: "graph:read",
    label: "Graph",
    description: "Entity relationships with source attribution",
  },
];

const TTL_OPTIONS = [
  { hours: 24, label: "24 hours" },
  { hours: 72, label: "3 days" },
  { hours: 336, label: "14 days" },
];

function linkState(share: ShareLink): {
  label: string;
  tone: "verified" | "attention" | "critical" | "neutral";
} {
  if (share.revokedAt) return { label: "revoked", tone: "critical" };
  if (new Date(share.expiresAt).getTime() < Date.now()) {
    return { label: "expired", tone: "neutral" };
  }
  return { label: "active", tone: "verified" };
}

export function ShareTab({
  shares,
  canShare,
  onCreate,
  onRevoke,
}: {
  shares: ShareLink[];
  canShare: boolean;
  onCreate: (audience: string, scopes: ShareScope[], ttlHours: number) => void;
  onRevoke: (id: string) => void;
}) {
  const [audience, setAudience] = useState("");
  const [selected, setSelected] = useState<ShareScope[]>([
    "summary:read",
    "compliance:read",
  ]);
  const [ttl, setTtl] = useState(72);
  const [copied, setCopied] = useState<string | null>(null);

  function toggle(scope: ShareScope) {
    setSelected((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function copy(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Panel>
        <PanelHeader
          title={`Share links · ${shares.length}`}
          subtitle="Each link is a scoped capability with its own expiry. Revoking one withdraws access immediately without affecting the others."
        />
        {shares.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Link2 size={20} className="mx-auto mb-2 text-ink-600" />
            <p className="text-xs text-ink-400">
              No links issued for this property yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-700">
            {shares.map((share) => {
              const state = linkState(share);
              const usable = state.label === "active";
              return (
                <li key={share.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={state.tone}>{state.label}</Badge>
                        <span className="font-mono text-[11px] text-ink-400">
                          /share/{share.token}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-ink-100">
                        {share.audience}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-500">
                        issued {formatDateTime(share.createdAt)} by{" "}
                        {share.createdBy} ·{" "}
                        {share.revokedAt
                          ? `revoked ${formatDateTime(share.revokedAt)}`
                          : `expires ${formatDateTime(share.expiresAt)}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                      {usable ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => copy(share.token)}>
                            {copied === share.token ? (
                              <Check size={13} />
                            ) : (
                              <Copy size={13} />
                            )}
                            {copied === share.token ? "Copied" : "Copy"}
                          </Button>
                          <Link href={`/share/${share.token}`} target="_blank">
                            <Button size="sm" variant="secondary">
                              <Eye size={13} />
                              Open
                            </Button>
                          </Link>
                          {canShare ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => onRevoke(share.id)}
                            >
                              <ShieldOff size={13} />
                              Revoke
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {share.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-ink-400"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>

                  {share.views.length > 0 ? (
                    <div className="mt-3 border-t border-ink-700 pt-2.5">
                      <p className="text-[10px] font-medium tracking-wide text-ink-500 uppercase">
                        {share.views.length} view
                        {share.views.length === 1 ? "" : "s"}
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {share.views.slice(-3).map((view, index) => (
                          <li
                            key={`${view.at}-${index}`}
                            className="flex justify-between text-[11px] text-ink-400"
                          >
                            <span>{view.viewer}</span>
                            <span className="text-ink-600">
                              {relativeTime(view.at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 border-t border-ink-700 pt-2.5 text-[11px] text-ink-600">
                      Not opened yet. Every view is logged.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="space-y-6">
        {canShare ? (
          <Panel>
            <PanelHeader
              title="Issue a link"
              subtitle="Grant only what the recipient needs. A bank asking about completeness does not need the document text."
            />
            <div className="space-y-4 px-5 py-4">
              <Field
                label="Recipient"
                hint="Recorded on the link and in the audit trail"
              >
                <input
                  className={inputClass}
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Adv. Meera Raghavan"
                />
              </Field>

              <div>
                <p className="mb-2 text-xs font-medium text-ink-300">Scopes</p>
                <div className="space-y-1.5">
                  {SCOPES.map((scope) => {
                    const active = selected.includes(scope.id);
                    return (
                      <button
                        key={scope.id}
                        onClick={() => toggle(scope.id)}
                        className={cx(
                          "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                          active
                            ? "border-brand-500/50 bg-brand-500/10"
                            : "border-ink-700 bg-ink-850 hover:border-ink-600",
                        )}
                      >
                        <span
                          className={cx(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            active
                              ? "border-brand-400 bg-brand-500 text-white"
                              : "border-ink-600",
                          )}
                        >
                          {active ? <Check size={10} strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-medium text-ink-100">
                            {scope.label}
                          </span>
                          <span className="block text-[10px] leading-relaxed text-ink-500">
                            {scope.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-ink-300">Expires in</p>
                <div className="flex gap-1.5">
                  {TTL_OPTIONS.map((option) => (
                    <button
                      key={option.hours}
                      onClick={() => setTtl(option.hours)}
                      className={cx(
                        "flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors",
                        ttl === option.hours
                          ? "border-brand-500/50 bg-brand-500/10 text-brand-300"
                          : "border-ink-700 bg-ink-850 text-ink-400 hover:border-ink-600",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                disabled={audience.trim().length === 0 || selected.length === 0}
                onClick={() => {
                  onCreate(audience.trim(), selected, ttl);
                  setAudience("");
                }}
              >
                <Link2 size={14} />
                Create link
              </Button>
            </div>
          </Panel>
        ) : (
          <Panel className="px-5 py-4">
            <p className="text-xs text-ink-400">
              This role cannot issue share links. Sign in as the property owner to
              grant access.
            </p>
          </Panel>
        )}

        <Disclaimer>
          In production a link is a signed capability token, not a guessable URL,
          and document previews are served through short-lived signed storage URLs
          minted per request rather than public object URLs.
        </Disclaimer>
      </div>
    </div>
  );
}
