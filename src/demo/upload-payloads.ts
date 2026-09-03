import type { SeedField } from "./seed-documents";

/**
 * What the simulated extraction stage "discovers" for each uploadable sample.
 *
 * Kept separate from the seeded corpus because these only materialise once the
 * pipeline actually reaches the extraction stage — a duplicate never gets here,
 * which is the point.
 *
 * Note the partition deed: its registration number is BNG-4-01187/2008-09, the
 * exact instrument that RV-000002's sale deed relies on. Uploading it to that
 * property closes the ownership chain gap and the finding disappears on the next
 * rule evaluation. Nothing is special-cased to make that happen; the consistency
 * engine simply stops finding a missing reference.
 */

export interface UploadPayload {
  pages: { page: number; text: string }[];
  fields: SeedField[];
}

export const UPLOAD_PAYLOADS: Record<string, UploadPayload> = {
  "up-oc": {
    pages: [
      {
        page: 1,
        text: `BRUHAT BENGALURU MAHANAGARA PALIKE
OCCUPANCY CERTIFICATE
(Under the Karnataka Municipal Corporations Act, 1976)

Certificate No.        : BBMP/OC/MHD/0188/2011-12
Date of Issue          : 14/06/2011
Building               : BRIGADE LAKEVIEW APARTMENTS, A, B and C BLOCKS
Land Reference         : Survey No. 42/3, Kadugodi Village, Varthur Hobli,
                         Bangalore East Taluk
Developer              : Brigade Lakeview Developers Pvt Ltd
Plan Sanction Reference: BBMP/Adn.Com/JD.MHD/0412/2007-08 dated 19/09/2007

Total Units Certified  : 96 residential apartments
Floors Certified       : Ground + 4 Upper Floors

The construction has been inspected and found to be in accordance with the
sanctioned plan, subject to the deviations noted in the inspection report dated
02/06/2011, which are within permissible limits. The building is hereby
certified as fit for occupation.

Executive Engineer, Mahadevapura Zone (digitally signed)`,
      },
    ],
    fields: [
      {
        key: "oc_number",
        label: "Certificate Number",
        aiValue: "BBMP/OC/MHD/0188/2011-12",
        aiConfidence: 0.95,
        page: 1,
        snippet: "Certificate No.        : BBMP/OC/MHD/0188/2011-12",
      },
      {
        key: "oc_date",
        label: "Date of Issue",
        aiValue: "14/06/2011",
        aiConfidence: 0.97,
        page: 1,
        snippet: "Date of Issue          : 14/06/2011",
      },
      {
        key: "survey_number",
        label: "Survey Number",
        aiValue: "Survey No. 42/3",
        aiConfidence: 0.93,
        page: 1,
        snippet:
          "Land Reference         : Survey No. 42/3, Kadugodi Village, Varthur Hobli",
      },
      {
        key: "sanctioned_units",
        label: "Units Certified",
        aiValue: "96 residential apartments",
        aiConfidence: 0.91,
        page: 1,
        snippet: "Total Units Certified  : 96 residential apartments",
      },
      {
        key: "deviation_note",
        label: "Deviations Noted",
        aiValue:
          "Deviations recorded in inspection report dated 02/06/2011, stated to be within permissible limits",
        aiConfidence: 0.79,
        page: 1,
        snippet:
          "subject to the deviations noted in the inspection report dated 02/06/2011, which are within permissible limits",
      },
    ],
  },

  "up-poor-scan": {
    pages: [
      {
        page: 1,
        text: `DEED OF PARTITION
(second generation photocopy — contrast poor, margins clipped)

EXECUTED ON THE FOURTEENTH DAY OF MAY, TWO THOUSAND EIGHT (14/05/2008)
AT DEVANAHALLI

AMONG THE LEGAL HEIRS OF LATE CHIKKANNA:
  1. MUNIVENKATAPPA, S/o Late Chikkanna, aged about 56 years
  2. MUNIYAMMA, D/o Late Chikkanna, aged about 52 years
  3. CHIKKAMUNIYAPPA, S/o Late Chikkanna, aged about 49 years

WHEREAS the parties are members of a Hindu joint family and have been holding
the family properties jointly, and whereas they have mutually agreed to
partition the same by metes and bounds...`,
      },
      {
        page: 2,
        text: `ALLOTMENT TO THE SHARE OF THE FIRST PARTY (MUNIVENKATAPPA)

Agricultural land bearing Survey No. 118/2 of Chikkajala Village, Jala Hobli,
Bangalore North Taluk, measuring 2 Acres 20 Guntas including kharab of
8 Guntas, together with the well situated therein.

REGISTRATION PARTICULARS
  Document No.         : BNG-4-01187/2008-09
  Date of Registration : 14/05/2008
  Sub-Registrar Office : Devanahalli, Bangalore Rural District

Each party shall hereafter hold, possess and enjoy the property allotted to
their respective share absolutely and to the exclusion of the others.`,
      },
    ],
    fields: [
      {
        key: "registration_number",
        label: "Document Number",
        aiValue: "BNG-4-01187/2008-09",
        aiConfidence: 0.74,
        page: 2,
        snippet: "Document No.         : BNG-4-01187/2008-09",
      },
      {
        key: "registration_date",
        label: "Date of Registration",
        aiValue: "14/05/2008",
        aiConfidence: 0.81,
        page: 2,
        snippet: "Date of Registration : 14/05/2008",
      },
      {
        key: "vendor_name",
        label: "Parties to the Partition",
        aiValue: "Munivenkatappa; Muniyamma; Chikkamuniyappa",
        aiConfidence: 0.68,
        page: 1,
        snippet:
          "1. MUNIVENKATAPPA, S/o Late Chikkanna ... 2. MUNIYAMMA ... 3. CHIKKAMUNIYAPPA",
      },
      {
        key: "purchaser_name",
        label: "Allottee of Schedule Property",
        aiValue: "Munivenkatappa",
        aiConfidence: 0.72,
        page: 2,
        snippet: "ALLOTMENT TO THE SHARE OF THE FIRST PARTY (MUNIVENKATAPPA)",
      },
      {
        key: "survey_number",
        label: "Survey Number",
        aiValue: "Survey No. 118/2",
        aiConfidence: 0.7,
        page: 2,
        snippet:
          "Agricultural land bearing Survey No. 118/2 of Chikkajala Village, Jala Hobli",
      },
      {
        key: "extent",
        label: "Extent",
        aiValue: "2 Acres 20 Guntas",
        aiConfidence: 0.64,
        page: 2,
        snippet: "measuring 2 Acres 20 Guntas including kharab of 8 Guntas",
      },
      {
        key: "sro",
        label: "Sub-Registrar Office",
        aiValue: "Devanahalli, Bangalore Rural District",
        aiConfidence: 0.77,
        page: 2,
        snippet: "Sub-Registrar Office : Devanahalli, Bangalore Rural District",
      },
    ],
  },

  "up-flaky": {
    pages: [
      {
        page: 1,
        text: `HDFC BANK LIMITED
LOAN AGAINST PROPERTY — SANCTION LETTER

Reference           : HDFC/LAP/BLR/2026/118447
Date                : 26/08/2026
Applicant           : Vinay Kumar S
Sanctioned Amount   : Rs. 45,00,000/- (Rupees Forty Five Lakhs only)
Rate of Interest    : 9.35% p.a. floating, linked to Repo Rate
Tenure              : 180 months
Processing Fee      : Rs. 22,500/- plus applicable GST

SECURITY OFFERED
Equitable mortgage of Flat No. 402, 4th Floor, A Block, Brigade Lakeview
Apartments, Survey No. 42/3, Kadugodi, Bengaluru 560067.

CONDITIONS PRECEDENT TO DISBURSEMENT
  1. Original title documents to be deposited with the Bank.
  2. Encumbrance Certificate for 13 years to be furnished.
  3. Occupancy Certificate for the building to be furnished.
  4. Latest property tax paid receipt to be furnished.
  5. Legal and technical clearance from the Bank's empanelled advocate.

This sanction is valid for 90 days from the date of this letter and does not
by itself create any charge over the property.`,
      },
    ],
    fields: [
      {
        key: "lender",
        label: "Lender",
        aiValue: "HDFC Bank Limited",
        aiConfidence: 0.96,
        page: 1,
        snippet: "HDFC BANK LIMITED  LOAN AGAINST PROPERTY — SANCTION LETTER",
      },
      {
        key: "sanction_reference",
        label: "Sanction Reference",
        aiValue: "HDFC/LAP/BLR/2026/118447",
        aiConfidence: 0.94,
        page: 1,
        snippet: "Reference           : HDFC/LAP/BLR/2026/118447",
      },
      {
        key: "sanctioned_amount",
        label: "Sanctioned Amount",
        aiValue: "Rs. 45,00,000",
        aiConfidence: 0.95,
        page: 1,
        snippet: "Sanctioned Amount   : Rs. 45,00,000/-",
      },
      {
        key: "survey_number",
        label: "Survey Number",
        aiValue: "Survey No. 42/3",
        aiConfidence: 0.88,
        page: 1,
        snippet:
          "Brigade Lakeview Apartments, Survey No. 42/3, Kadugodi, Bengaluru 560067",
      },
      {
        key: "conditions",
        label: "Conditions Precedent",
        aiValue:
          "Originals deposited; 13-year EC; Occupancy Certificate; latest tax receipt; advocate clearance",
        aiConfidence: 0.83,
        page: 1,
        snippet:
          "CONDITIONS PRECEDENT TO DISBURSEMENT 1. Original title documents to be deposited with the Bank.",
      },
      {
        key: "charge_created",
        label: "Charge Created by This Document",
        aiValue: "No — sanction letter only, no charge created",
        aiConfidence: 0.86,
        page: 1,
        snippet:
          "does not by itself create any charge over the property",
      },
    ],
  },
};
