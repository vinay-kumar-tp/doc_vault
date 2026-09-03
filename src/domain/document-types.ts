import type { DocumentTypeId, DocumentTypeMeta } from "./types";

/**
 * The v1 document taxonomy, scoped to Karnataka / Bengaluru transactions.
 *
 * Field sets below reflect what these documents actually carry:
 *  - Sale deeds carry party identity (age, S/o or W/o, PAN, Aadhaar), the
 *    consideration, a schedule with survey number, extent and four boundaries,
 *    and registration details from the Sub-Registrar Office.
 *  - A Karnataka Encumbrance Certificate is issued as Form 15 when registered
 *    encumbrances exist for the searched period, and Form 16 when the search
 *    returns nil.
 *  - Khata / e-Khata is a BBMP municipal record keyed by khata number, PID and
 *    the SAS base application number; it identifies who is liable for tax, and
 *    is classified A-Khata or B-Khata.
 *  - RTC (Pahani) is the revenue record for agricultural land: survey and hissa
 *    number, extent in acres-guntas, kharab, land classification, season-wise
 *    crop entries and the mutation register reference.
 *  - A BBMP tax receipt carries the SAS application number, PID, assessment
 *    year, amount and a payment reference.
 *
 * Sources consulted while modelling these field sets:
 *  - Karnataka Dept. of Stamps & Registration, Kaveri Online Services
 *    https://kaverionline.karnataka.gov.in/
 *  - BBMP Property Tax System https://bbmptax.karnataka.gov.in/
 *  - BBMP e-Aasthi https://www.bbmpeaasthi.karnataka.gov.in/
 *  - Encumbrance Certificate Form 15 vs Form 16
 *    https://cleartax.in/s/encumbrance-certificate-karnataka
 *  - RTC / Pahani field breakdown
 *    https://web.landeed.com/karnataka/rtc-search-by-name
 * Content was rephrased for compliance with licensing restrictions.
 */
export const DOCUMENT_TYPES: Record<DocumentTypeId, DocumentTypeMeta> = {
  sale_deed: {
    id: "sale_deed",
    label: "Sale Deed",
    shortLabel: "Sale Deed",
    issuer: "Sub-Registrar Office",
    purpose:
      "Registered instrument transferring ownership from vendor to purchaser.",
  },
  mother_deed: {
    id: "mother_deed",
    label: "Mother Deed / Parent Document",
    shortLabel: "Mother Deed",
    issuer: "Sub-Registrar Office",
    purpose:
      "Earlier title document that establishes how the vendor came to own the property.",
  },
  encumbrance_certificate: {
    id: "encumbrance_certificate",
    label: "Encumbrance Certificate",
    shortLabel: "EC",
    issuer: "Dept. of Stamps & Registration",
    purpose:
      "Lists registered transactions against the property for a searched period.",
  },
  khata: {
    id: "khata",
    label: "Khata / e-Khata Extract",
    shortLabel: "Khata",
    issuer: "BBMP",
    purpose:
      "Municipal record identifying who is assessed for property tax on the asset.",
  },
  rtc: {
    id: "rtc",
    label: "RTC (Pahani)",
    shortLabel: "RTC",
    issuer: "Dept. of Revenue (Bhoomi)",
    purpose:
      "Record of Rights, Tenancy and Crops for agricultural land holdings.",
  },
  tax_receipt: {
    id: "tax_receipt",
    label: "Property Tax Receipt",
    shortLabel: "Tax Receipt",
    issuer: "BBMP",
    purpose: "Evidence that property tax was paid for an assessment year.",
  },
  occupancy_certificate: {
    id: "occupancy_certificate",
    label: "Occupancy Certificate",
    shortLabel: "OC",
    issuer: "BBMP / Planning Authority",
    purpose:
      "Certifies the completed building is fit for occupation as sanctioned.",
  },
  building_plan: {
    id: "building_plan",
    label: "Sanctioned Building Plan",
    shortLabel: "Plan",
    issuer: "BBMP / BDA",
    purpose: "Approved plan against which construction was permitted.",
  },
  conversion_order: {
    id: "conversion_order",
    label: "Land Conversion Order",
    shortLabel: "Conversion",
    issuer: "Deputy Commissioner",
    purpose:
      "Permits agricultural land to be used for a non-agricultural purpose.",
  },
  loan_sanction: {
    id: "loan_sanction",
    label: "Loan / Mortgage Document",
    shortLabel: "Loan",
    issuer: "Bank / NBFC",
    purpose: "Records a charge created over the property by a lender.",
  },
  unclassified: {
    id: "unclassified",
    label: "Unclassified Document",
    shortLabel: "Unknown",
    issuer: "—",
    purpose: "Classifier confidence was too low to assign a type.",
  },
};

export const DOCUMENT_TYPE_ORDER: DocumentTypeId[] = [
  "sale_deed",
  "mother_deed",
  "encumbrance_certificate",
  "khata",
  "rtc",
  "tax_receipt",
  "occupancy_certificate",
  "building_plan",
  "conversion_order",
  "loan_sanction",
  "unclassified",
];

export function documentTypeMeta(id: DocumentTypeId): DocumentTypeMeta {
  return DOCUMENT_TYPES[id] ?? DOCUMENT_TYPES.unclassified;
}
