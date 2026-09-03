import type { ComplianceRuleSet, PropertyKind } from "./types";

/**
 * Compliance checklists as versioned DATA, not code branches.
 *
 * Every generated report snapshots the `version` string it was evaluated
 * against. Without that snapshot, editing a checklist would silently rewrite the
 * meaning of every historical report, which is exactly what makes a
 * due-diligence artefact indefensible.
 *
 * Bump the version whenever the rule list changes. Never edit a version in place.
 */

const APARTMENT: ComplianceRuleSet = {
  id: "rs-apartment",
  appliesTo: "apartment",
  label: "Apartment purchase checklist (Karnataka)",
  version: "2026.02",
  rules: [
    {
      id: "ap-1",
      documentType: "sale_deed",
      label: "Registered Sale Deed",
      required: true,
      rationale:
        "The operative instrument of transfer. Without it there is no registered title in the buyer's name.",
    },
    {
      id: "ap-2",
      documentType: "mother_deed",
      label: "Mother deed / parent document",
      required: true,
      rationale:
        "Establishes how the seller acquired the property and lets the chain of title be traced backwards.",
    },
    {
      id: "ap-3",
      documentType: "encumbrance_certificate",
      label: "Encumbrance Certificate",
      required: true,
      rationale:
        "Reveals registered charges, mortgages and transfers over the searched period.",
    },
    {
      id: "ap-4",
      documentType: "khata",
      label: "Khata / e-Khata extract",
      required: true,
      rationale:
        "Municipal record of who is assessed for tax. Required for registration within BBMP limits.",
    },
    {
      id: "ap-5",
      documentType: "tax_receipt",
      label: "Latest property tax receipt",
      required: true,
      rationale:
        "Shows municipal dues are current. Arrears attach to the property, not the previous owner.",
    },
    {
      id: "ap-6",
      documentType: "occupancy_certificate",
      label: "Occupancy Certificate",
      required: true,
      rationale:
        "Certifies the completed building was cleared for occupation as sanctioned. Its absence is a common defect in Bengaluru apartment files.",
    },
    {
      id: "ap-7",
      documentType: "building_plan",
      label: "Sanctioned building plan",
      required: false,
      rationale:
        "Lets the as-built structure be compared against what was actually permitted.",
    },
    {
      id: "ap-8",
      documentType: "loan_sanction",
      label: "Loan / mortgage documents",
      required: false,
      rationale:
        "Needed only where a lender has or had a charge over the property.",
    },
  ],
};

const PLOT: ComplianceRuleSet = {
  id: "rs-plot",
  appliesTo: "plot",
  label: "Converted residential site checklist (Karnataka)",
  version: "2026.02",
  rules: [
    {
      id: "pl-1",
      documentType: "sale_deed",
      label: "Registered Sale Deed",
      required: true,
      rationale: "The operative instrument of transfer for the site.",
    },
    {
      id: "pl-2",
      documentType: "encumbrance_certificate",
      label: "Encumbrance Certificate",
      required: true,
      rationale:
        "Reveals registered charges and transfers over the searched period.",
    },
    {
      id: "pl-3",
      documentType: "khata",
      label: "Khata / e-Khata extract",
      required: true,
      rationale:
        "Identifies the assessee of record and distinguishes A-Khata from B-Khata.",
    },
    {
      id: "pl-4",
      documentType: "conversion_order",
      label: "Land conversion order",
      required: true,
      rationale:
        "A site carved out of agricultural land needs a Section 95 conversion order before non-agricultural use is lawful.",
    },
    {
      id: "pl-5",
      documentType: "tax_receipt",
      label: "Latest property tax receipt",
      required: true,
      rationale: "Confirms local body dues are current.",
    },
    {
      id: "pl-6",
      documentType: "mother_deed",
      label: "Mother deed / parent document",
      required: false,
      rationale:
        "Strengthens the chain of title where the layout promoter's acquisition needs tracing.",
    },
  ],
};

const AGRICULTURAL: ComplianceRuleSet = {
  id: "rs-agri",
  appliesTo: "agricultural_land",
  label: "Agricultural land checklist (Karnataka)",
  version: "2026.02",
  rules: [
    {
      id: "ag-1",
      documentType: "sale_deed",
      label: "Registered Sale Deed",
      required: true,
      rationale: "The operative instrument of transfer.",
    },
    {
      id: "ag-2",
      documentType: "mother_deed",
      label: "Mother deed / parent document",
      required: true,
      rationale:
        "For land acquired by partition or inheritance the parent instrument is the only way to verify the seller's share.",
    },
    {
      id: "ag-3",
      documentType: "rtc",
      label: "RTC (Pahani)",
      required: true,
      rationale:
        "Revenue record showing khatedar, extent, kharab, classification and the mutation that recorded the acquisition.",
    },
    {
      id: "ag-4",
      documentType: "encumbrance_certificate",
      label: "Encumbrance Certificate",
      required: true,
      rationale: "Reveals registered charges over the searched period.",
    },
    {
      id: "ag-5",
      documentType: "tax_receipt",
      label: "Land revenue receipt",
      required: true,
      rationale: "Confirms land revenue has been remitted.",
    },
    {
      id: "ag-6",
      documentType: "conversion_order",
      label: "Conversion order",
      required: false,
      rationale:
        "Required only if the land is intended for non-agricultural use.",
    },
  ],
};

const COMMERCIAL: ComplianceRuleSet = {
  id: "rs-commercial",
  appliesTo: "commercial",
  label: "Commercial property checklist (Karnataka)",
  version: "2026.02",
  rules: [
    {
      id: "cm-1",
      documentType: "sale_deed",
      label: "Registered Sale Deed",
      required: true,
      rationale: "The operative instrument of transfer.",
    },
    {
      id: "cm-2",
      documentType: "encumbrance_certificate",
      label: "Encumbrance Certificate",
      required: true,
      rationale: "Reveals registered charges over the searched period.",
    },
    {
      id: "cm-3",
      documentType: "khata",
      label: "Khata / e-Khata extract",
      required: true,
      rationale: "Municipal assessment record for the premises.",
    },
    {
      id: "cm-4",
      documentType: "occupancy_certificate",
      label: "Occupancy Certificate",
      required: true,
      rationale: "Certifies the premises were cleared for occupation.",
    },
    {
      id: "cm-5",
      documentType: "building_plan",
      label: "Sanctioned building plan",
      required: true,
      rationale:
        "Commercial usage depends on what the sanction actually permitted.",
    },
    {
      id: "cm-6",
      documentType: "tax_receipt",
      label: "Latest property tax receipt",
      required: true,
      rationale: "Confirms municipal dues are current.",
    },
  ],
};

export const RULE_SETS: Record<PropertyKind, ComplianceRuleSet> = {
  apartment: APARTMENT,
  plot: PLOT,
  agricultural_land: AGRICULTURAL,
  commercial: COMMERCIAL,
};

export function ruleSetFor(kind: PropertyKind): ComplianceRuleSet {
  return RULE_SETS[kind];
}

export const PROPERTY_KIND_LABEL: Record<PropertyKind, string> = {
  apartment: "Apartment",
  plot: "Residential site / plot",
  agricultural_land: "Agricultural land",
  commercial: "Commercial property",
};
