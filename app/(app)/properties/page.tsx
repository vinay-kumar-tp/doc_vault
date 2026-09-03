"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, Plus, X } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Meter,
  Panel,
  PanelHeader,
  inputClass,
} from "@/components/ui";
import { formatDate } from "@/domain/clock";
import { READINESS_COPY, readinessBand } from "@/domain/compliance";
import { PROPERTY_KIND_LABEL, ruleSetFor } from "@/domain/rules";
import type { PropertyKind } from "@/domain/types";
import { useVault, type CreatePropertyInput } from "@/store/vault-store";

const EMPTY_FORM: CreatePropertyInput = {
  title: "",
  kind: "apartment",
  line1: "",
  locality: "",
  city: "Bengaluru",
  district: "Bangalore Urban",
  pincode: "",
  surveyNumber: "",
  khataNumber: "",
  village: "",
  hobli: "",
  statedExtent: "",
};

const KINDS: PropertyKind[] = [
  "apartment",
  "plot",
  "agricultural_land",
  "commercial",
];

export default function PropertiesPage() {
  const { properties, documents, reportFor, createProperty, currentUser } =
    useVault();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreatePropertyInput>(EMPTY_FORM);

  const canCreate = currentUser?.role !== "buyer";
  const ruleSet = useMemo(() => ruleSetFor(form.kind), [form.kind]);

  function update<K extends keyof CreatePropertyInput>(
    key: K,
    value: CreatePropertyInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (form.title.trim().length === 0) return;
    const id = createProperty(form);
    setForm(EMPTY_FORM);
    setOpen(false);
    router.push(`/properties/${id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Properties"
        description="A property profile comes first and documents attach to it. The property is the record; files are evidence for it."
        action={
          canCreate ? (
            <Button variant="primary" onClick={() => setOpen((v) => !v)}>
              {open ? <X size={15} /> : <Plus size={15} />}
              {open ? "Cancel" : "New property"}
            </Button>
          ) : (
            <Badge tone="neutral">Read-only role</Badge>
          )
        }
      />

      <div className="space-y-6 px-8 py-6">
        {open && canCreate ? (
          <Panel className="anim-fade-up">
            <PanelHeader
              title="Create a property profile"
              subtitle="Only a title is required. Everything else can be corrected later from what the documents actually say."
            />
            <div className="grid gap-4 px-5 py-5 md:grid-cols-3">
              <div className="md:col-span-2">
                <Field
                  label="Title"
                  hint="How you will recognise it in a list, e.g. Flat 402, Brigade Lakeview"
                >
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="Flat 1201, Prestige Falcon City"
                  />
                </Field>
              </div>
              <Field
                label="Property type"
                hint={`Selects the "${ruleSet.label}" checklist, version ${ruleSet.version}`}
              >
                <select
                  className={inputClass}
                  value={form.kind}
                  onChange={(e) => update("kind", e.target.value as PropertyKind)}
                >
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {PROPERTY_KIND_LABEL[kind]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Address line">
                  <input
                    className={inputClass}
                    value={form.line1}
                    onChange={(e) => update("line1", e.target.value)}
                    placeholder="Flat No. 1201, Tower C, ..."
                  />
                </Field>
              </div>
              <Field label="Locality">
                <input
                  className={inputClass}
                  value={form.locality}
                  onChange={(e) => update("locality", e.target.value)}
                  placeholder="Konanakunte"
                />
              </Field>

              <Field label="City">
                <input
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </Field>
              <Field label="District">
                <input
                  className={inputClass}
                  value={form.district}
                  onChange={(e) => update("district", e.target.value)}
                />
              </Field>
              <Field label="Pincode">
                <input
                  className={inputClass}
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                  placeholder="560062"
                  inputMode="numeric"
                />
              </Field>

              <Field
                label="Survey number"
                hint="Written however it appears on the deed. It gets normalised."
              >
                <input
                  className={inputClass}
                  value={form.surveyNumber}
                  onChange={(e) => update("surveyNumber", e.target.value)}
                  placeholder="Sy. No. 88/4"
                />
              </Field>
              <Field label="Khata number">
                <input
                  className={inputClass}
                  value={form.khataNumber}
                  onChange={(e) => update("khataNumber", e.target.value)}
                  placeholder="61-92-1188"
                />
              </Field>
              <Field label="Stated extent">
                <input
                  className={inputClass}
                  value={form.statedExtent}
                  onChange={(e) => update("statedExtent", e.target.value)}
                  placeholder="1,650 sq ft"
                />
              </Field>

              <Field label="Village">
                <input
                  className={inputClass}
                  value={form.village}
                  onChange={(e) => update("village", e.target.value)}
                  placeholder="Konanakunte"
                />
              </Field>
              <Field label="Hobli">
                <input
                  className={inputClass}
                  value={form.hobli}
                  onChange={(e) => update("hobli", e.target.value)}
                  placeholder="Uttarahalli"
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-ink-700 px-5 py-4">
              <p className="text-[11px] text-ink-500">
                The new property starts empty. Upload a sample document from its
                workspace to watch the pipeline run.
              </p>
              <Button
                variant="primary"
                onClick={submit}
                disabled={form.title.trim().length === 0}
              >
                Create property
              </Button>
            </div>
          </Panel>
        ) : null}

        {properties.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<Building2 size={22} />}
              title="No properties yet"
              description="Create a property profile, then attach documents to it."
            />
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {properties.map((property) => {
              const docs = documents.filter((d) => d.propertyId === property.id);
              const report = reportFor(property.id);
              const band = report ? readinessBand(report) : "review";
              const set = ruleSetFor(property.kind);
              return (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="group rounded-[14px] border border-ink-700 bg-ink-900 p-5 transition-colors hover:border-ink-600 hover:bg-ink-850"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] text-ink-500">
                        {property.ref}
                      </span>
                      <p className="mt-1 truncate text-sm font-medium text-ink-100">
                        {property.title}
                      </p>
                    </div>
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
                  </div>

                  <p className="mt-2 text-xs text-ink-400">
                    {PROPERTY_KIND_LABEL[property.kind]} ·{" "}
                    {property.address.locality}, {property.address.city}
                  </p>

                  <div className="mt-4">
                    <Meter
                      value={report?.completenessPct ?? 0}
                      tone={
                        band === "blocked"
                          ? "critical"
                          : band === "review"
                            ? "attention"
                            : "verified"
                      }
                      label={`${report?.completenessPct ?? 0}% of "${set.label}" v${set.version}`}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-ink-700 pt-3 text-[11px] text-ink-500">
                    <span>
                      {docs.length} document{docs.length === 1 ? "" : "s"}
                    </span>
                    <span>created {formatDate(property.createdAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
