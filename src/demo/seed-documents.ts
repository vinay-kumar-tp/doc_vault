import type { DocumentTypeId } from "@/domain/types";

/**
 * Seed corpus for the demo.
 *
 * These are SYNTHETIC documents. Names, PANs, Aadhaar numbers, khata numbers and
 * registration numbers are invented. What is faithful is the *structure* and the
 * field vocabulary of real Karnataka instruments — the schedule and four
 * boundaries of a sale deed, the entry table of a Form 15 EC, the khata / PID /
 * SAS triple on a BBMP record, the survey-hissa-extent-kharab-mutation columns
 * of an RTC, and the SAS + assessment-year + payment-reference shape of a BBMP
 * tax receipt.
 *
 * Three properties are seeded deliberately:
 *   RV-000001  mostly complete, one missing document and a name variant
 *   RV-000002  a genuinely problematic land parcel: chain gap, survey number
 *              mismatch, extent mismatch, live mortgage
 *   RV-000003  a clean plot, to show what "nothing to action" looks like
 */

export interface SeedField {
  key: string;
  label: string;
  aiValue: string;
  aiConfidence: number;
  page: number;
  snippet: string;
}

export interface SeedDocument {
  id: string;
  propertyId: string;
  fileName: string;
  docType: DocumentTypeId;
  docTypeConfidence: number;
  uploadedAt: string;
  uploadedBy: string;
  sizeBytes: number;
  pages: { page: number; text: string }[];
  fields: SeedField[];
  /** Fields already signed off by a reviewer in the seeded state. */
  approvedFieldKeys?: string[];
}

/* ================================================================ RV-000001 */
/* Apartment, Whitefield. Well documented apart from the Occupancy Certificate. */

const P1_SALE_DEED: SeedDocument = {
  id: "doc-1001",
  propertyId: "prop-1",
  fileName: "Sale_Deed_Flat402_Brigade_Lakeview_2019.pdf",
  docType: "sale_deed",
  docTypeConfidence: 0.98,
  uploadedAt: "2026-08-14T09:12:00.000Z",
  uploadedBy: "Vinay Kumar S",
  sizeBytes: 4_812_004,
  pages: [
    {
      page: 1,
      text: `KARNATAKA STATE — DEPARTMENT OF STAMPS AND REGISTRATION
DEED OF ABSOLUTE SALE

THIS DEED OF SALE IS MADE AND EXECUTED ON THIS THE EIGHTEENTH DAY OF MARCH,
YEAR TWO THOUSAND NINETEEN (18/03/2019) AT BANGALORE:

BY
1. Mr. RAMACHANDRAPPA K. B.
   Aged about 53 years, Son of Late Mr. Basavanappa
   PAN: BHUPR2571P
2. Mrs. LALITHA A.
   Aged about 42 years, Wife of Mr. Ramachandrappa K. B.
   PAN: AKTPL5145L

Both residing at Sri Lakshmi Nilaya, No. 36, 4th Main Road, 4th Cross,
Laggere, Bangalore - 560 058.

Hereinafter called the "VENDORS" (which expression shall wherever the context
so admits include their heirs, executors, administrators and assigns)

IN FAVOUR OF
Mr. VINAY KUMAR S.
Aged about 31 years, Son of Mr. Srinivasa Murthy
PAN: AQWPV8812K
Residing at No. 14, 2nd Floor, Kaveri Residency, HSR Layout, Bangalore - 560 102.

Hereinafter called the "PURCHASER".`,
    },
    {
      page: 2,
      text: `WHEREAS the Vendors are the absolute owners in lawful possession and
enjoyment of the Schedule Property having acquired the same under a registered
Sale Deed dated 22/07/2011 registered as Document No. BNG-1-02218/2011-12 in
the office of the Sub-Registrar, Whitefield, Bangalore.

AND WHEREAS the Vendors have agreed to sell the Schedule Property to the
Purchaser for a total sale consideration of Rs. 82,50,000/- (Rupees Eighty Two
Lakhs Fifty Thousand only).

NOW THEREFORE THIS DEED WITNESSETH that in consideration of the said sum of
Rs. 82,50,000/- paid by the Purchaser to the Vendors by way of RTGS bearing
UTR No. HDFCR52019031800419 dated 18/03/2019, the receipt whereof the Vendors
do hereby acknowledge, the Vendors do hereby sell, convey, transfer and assign
absolutely unto the Purchaser the Schedule Property.

The Vendors hereby covenant that the Schedule Property is free from all
encumbrances, charges, liens, attachments and litigation of any nature
whatsoever as on the date of execution of this deed.`,
    },
    {
      page: 3,
      text: `SCHEDULE OF THE PROPERTY

All that piece and parcel of the residential Apartment bearing Flat No. 402,
on the Fourth Floor, "A" Block, BRIGADE LAKEVIEW APARTMENTS, constructed on
land bearing Survey No. 42/3 of Kadugodi Village, Varthur Hobli,
Bangalore East Taluk, situated within the limits of Bruhat Bengaluru
Mahanagara Palike, Ward No. 84 (Hagadur), measuring a Super Built-up Area of
1,485 Sq. Ft. together with an undivided share of 0.42% in the land, and one
covered car parking space bearing No. B-27.

BOUNDED AS FOLLOWS:
  EAST  : Flat No. 401
  WEST  : Open terrace and staircase
  NORTH : Common corridor
  SOUTH : Open to sky, setback area

REGISTRATION PARTICULARS
  Document No.        : BNG-1-04521/2019-20
  Book                : 1
  Date of Registration: 18/03/2019
  Sub-Registrar Office: Whitefield, Bangalore Urban District
  Market Value        : Rs. 79,20,000/-
  Stamp Duty Paid     : Rs. 4,53,750/-
  Registration Fee    : Rs. 82,500/-

IN WITNESS WHEREOF the parties have signed in the presence of:
  1. Mr. Manjunath H. R., No. 8, Kadugodi Main Road, Bangalore
  2. Mrs. Sarojamma N., No. 112, Varthur Road, Bangalore`,
    },
  ],
  fields: [
    {
      key: "vendor_name",
      label: "Vendor",
      aiValue: "Ramachandrappa K. B.; Lalitha A.",
      aiConfidence: 0.97,
      page: 1,
      snippet: "BY 1. Mr. RAMACHANDRAPPA K. B. ... 2. Mrs. LALITHA A.",
    },
    {
      key: "purchaser_name",
      label: "Purchaser",
      aiValue: "Vinay Kumar S.",
      aiConfidence: 0.99,
      page: 1,
      snippet: "IN FAVOUR OF Mr. VINAY KUMAR S. Aged about 31 years",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 42/3",
      aiConfidence: 0.96,
      page: 3,
      snippet:
        "constructed on land bearing Survey No. 42/3 of Kadugodi Village, Varthur Hobli",
    },
    {
      key: "extent",
      label: "Extent",
      aiValue: "1,485 Sq. Ft.",
      aiConfidence: 0.94,
      page: 3,
      snippet: "measuring a Super Built-up Area of 1,485 Sq. Ft.",
    },
    {
      key: "consideration",
      label: "Consideration",
      aiValue: "Rs. 82,50,000",
      aiConfidence: 0.98,
      page: 2,
      snippet:
        "a total sale consideration of Rs. 82,50,000/- (Rupees Eighty Two Lakhs Fifty Thousand only)",
    },
    {
      key: "registration_number",
      label: "Document Number",
      aiValue: "BNG-1-04521/2019-20",
      aiConfidence: 0.97,
      page: 3,
      snippet: "Document No. : BNG-1-04521/2019-20  Book : 1",
    },
    {
      key: "registration_date",
      label: "Date of Registration",
      aiValue: "18/03/2019",
      aiConfidence: 0.99,
      page: 3,
      snippet: "Date of Registration: 18/03/2019",
    },
    {
      key: "sro",
      label: "Sub-Registrar Office",
      aiValue: "Whitefield, Bangalore Urban District",
      aiConfidence: 0.95,
      page: 3,
      snippet: "Sub-Registrar Office: Whitefield, Bangalore Urban District",
    },
    {
      key: "parent_document",
      label: "Parent Document Cited",
      aiValue: "BNG-1-02218/2011-12 dated 22/07/2011",
      aiConfidence: 0.91,
      page: 2,
      snippet:
        "registered Sale Deed dated 22/07/2011 registered as Document No. BNG-1-02218/2011-12",
    },
    {
      key: "village",
      label: "Village / Hobli",
      aiValue: "Kadugodi Village, Varthur Hobli",
      aiConfidence: 0.93,
      page: 3,
      snippet: "of Kadugodi Village, Varthur Hobli, Bangalore East Taluk",
    },
  ],
  approvedFieldKeys: [
    "vendor_name",
    "purchaser_name",
    "survey_number",
    "registration_number",
    "registration_date",
  ],
};

const P1_MOTHER_DEED: SeedDocument = {
  id: "doc-1002",
  propertyId: "prop-1",
  fileName: "Mother_Deed_2011_Ramachandrappa.pdf",
  docType: "mother_deed",
  docTypeConfidence: 0.93,
  uploadedAt: "2026-08-14T09:15:00.000Z",
  uploadedBy: "Vinay Kumar S",
  sizeBytes: 3_204_881,
  pages: [
    {
      page: 1,
      text: `DEED OF ABSOLUTE SALE executed on 22/07/2011 at Bangalore

BY: BRIGADE LAKEVIEW DEVELOPERS PRIVATE LIMITED,
    a company incorporated under the Companies Act 1956,
    CIN: U45200KA2006PTC039118,
    represented by its Authorised Signatory Mr. Prakash Rao D.,
    registered office at No. 29, Brigade Road, Bangalore - 560 001
    ("VENDOR" / "DEVELOPER")

IN FAVOUR OF:
    1. Mr. RAMACHANDRAPPA K. B., aged about 45 years, S/o Late Basavanappa
    2. Mrs. LALITHA A., aged about 34 years, W/o Ramachandrappa K. B.
    ("PURCHASERS")

Consideration: Rs. 38,75,000/- (Rupees Thirty Eight Lakhs Seventy Five
Thousand only)`,
    },
    {
      page: 2,
      text: `SCHEDULE

Flat No. 402, Fourth Floor, "A" Block, BRIGADE LAKEVIEW APARTMENTS, on land
bearing Survey No. 42/3 of Kadugodi Village, Varthur Hobli, Bangalore East
Taluk, measuring Super Built-up Area 1,485 Sq. Ft.

REGISTRATION PARTICULARS
  Document No.         : BNG-1-02218/2011-12
  Date of Registration : 22/07/2011
  Sub-Registrar Office : Whitefield, Bangalore Urban District

The Developer derived title to the larger land from a Joint Development
Agreement dated 04/02/2007 registered as Document No. BNG-1-00891/2007-08 with
the landowners of Survey No. 42/3, Kadugodi Village.`,
    },
  ],
  fields: [
    {
      key: "vendor_name",
      label: "Vendor",
      aiValue: "Brigade Lakeview Developers Private Limited",
      aiConfidence: 0.96,
      page: 1,
      snippet: "BY: BRIGADE LAKEVIEW DEVELOPERS PRIVATE LIMITED",
    },
    {
      key: "purchaser_name",
      label: "Purchaser",
      aiValue: "Ramachandrappa K. B.; Lalitha A.",
      aiConfidence: 0.95,
      page: 1,
      snippet:
        "IN FAVOUR OF: 1. Mr. RAMACHANDRAPPA K. B. ... 2. Mrs. LALITHA A.",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 42/3",
      aiConfidence: 0.94,
      page: 2,
      snippet: "on land bearing Survey No. 42/3 of Kadugodi Village",
    },
    {
      key: "extent",
      label: "Extent",
      aiValue: "1,485 Sq. Ft.",
      aiConfidence: 0.92,
      page: 2,
      snippet: "measuring Super Built-up Area 1,485 Sq. Ft.",
    },
    {
      key: "registration_number",
      label: "Document Number",
      aiValue: "BNG-1-02218/2011-12",
      aiConfidence: 0.96,
      page: 2,
      snippet: "Document No. : BNG-1-02218/2011-12",
    },
    {
      key: "registration_date",
      label: "Date of Registration",
      aiValue: "22/07/2011",
      aiConfidence: 0.98,
      page: 2,
      snippet: "Date of Registration : 22/07/2011",
    },
    {
      key: "consideration",
      label: "Consideration",
      aiValue: "Rs. 38,75,000",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Consideration: Rs. 38,75,000/-",
    },
  ],
  approvedFieldKeys: ["registration_number", "registration_date"],
};

const P1_EC: SeedDocument = {
  id: "doc-1003",
  propertyId: "prop-1",
  fileName: "EC_Form15_Flat402_2004_to_2026.pdf",
  docType: "encumbrance_certificate",
  docTypeConfidence: 0.99,
  uploadedAt: "2026-08-14T09:21:00.000Z",
  uploadedBy: "Vinay Kumar S",
  sizeBytes: 1_104_220,
  pages: [
    {
      page: 1,
      text: `GOVERNMENT OF KARNATAKA
DEPARTMENT OF STAMPS AND REGISTRATION
CERTIFICATE OF ENCUMBRANCE ON PROPERTY
FORM No. 15
(Under Section 57 of the Registration Act, 1908)

Office of the Sub-Registrar : WHITEFIELD, BANGALORE URBAN
Period of Search           : 01/04/2004 to 31/03/2026
Applicant                  : Vinay Kumar S.
Application No.            : EC/WF/2026/0044182
Date of Issue              : 02/08/2026

PROPERTY DESCRIPTION AS PER APPLICATION
Flat No. 402, Fourth Floor, "A" Block, Brigade Lakeview Apartments,
Survey No. 42/3, Kadugodi Village, Varthur Hobli, Bangalore East Taluk,
Super Built-up Area 1,485 Sq. Ft.`,
    },
    {
      page: 2,
      text: `ENTRIES FOUND FOR THE PERIOD OF SEARCH

Sl. 1
  Nature of Deed      : SALE DEED
  Document No.        : BNG-1-02218/2011-12
  Date of Registration: 22/07/2011
  Executant           : Brigade Lakeview Developers Pvt Ltd
  Claimant            : Ramachandrappa K. B. and Lalitha A.
  Consideration       : Rs. 38,75,000/-
  Volume / Page       : 1148 / 221-236

Sl. 2
  Nature of Deed      : DEED OF MORTGAGE
  Document No.        : BNG-1-02367/2011-12
  Date of Registration: 09/08/2011
  Executant           : Ramachandrappa K. B. and Lalitha A.
  Claimant            : Canara Bank, Kadugodi Branch
  Amount Secured      : Rs. 28,00,000/-
  Volume / Page       : 1151 / 090-101

Sl. 3
  Nature of Deed      : DEED OF RELEASE / DISCHARGE OF MORTGAGE
  Document No.        : BNG-1-09914/2018-19
  Date of Registration: 27/12/2018
  Executant           : Canara Bank, Kadugodi Branch
  Claimant            : Ramachandrappa K. B. and Lalitha A.
  Volume / Page       : 1402 / 511-514

Sl. 4
  Nature of Deed      : SALE DEED
  Document No.        : BNG-1-04521/2019-20
  Date of Registration: 18/03/2019
  Executant           : Ramachandrappa K. B. and Lalitha A.
  Claimant            : Vinay Kumar S.
  Consideration       : Rs. 82,50,000/-
  Volume / Page       : 1489 / 302-319

No further entries were found in the records of this office for the
period of search stated above.`,
    },
  ],
  fields: [
    {
      key: "period_searched",
      label: "Period of Search",
      aiValue: "01/04/2004 to 31/03/2026",
      aiConfidence: 0.99,
      page: 1,
      snippet: "Period of Search : 01/04/2004 to 31/03/2026",
    },
    {
      key: "form_type",
      label: "Form",
      aiValue: "Form 15 (encumbrances found)",
      aiConfidence: 0.98,
      page: 1,
      snippet: "CERTIFICATE OF ENCUMBRANCE ON PROPERTY FORM No. 15",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 42/3",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Survey No. 42/3, Kadugodi Village, Varthur Hobli",
    },
    {
      key: "entry_count",
      label: "Entries Found",
      aiValue: "4",
      aiConfidence: 0.97,
      page: 2,
      snippet: "Sl. 1 ... Sl. 2 ... Sl. 3 ... Sl. 4",
    },
    {
      key: "latest_owner",
      label: "Most Recent Claimant",
      aiValue: "Vinay Kumar S.",
      aiConfidence: 0.96,
      page: 2,
      snippet: "Claimant : Vinay Kumar S.  Consideration : Rs. 82,50,000/-",
    },
    {
      key: "open_mortgage",
      label: "Unreleased Charge",
      aiValue: "None — mortgage of 2011 released in 2018",
      aiConfidence: 0.88,
      page: 2,
      snippet:
        "DEED OF RELEASE / DISCHARGE OF MORTGAGE Document No. BNG-1-09914/2018-19",
    },
    {
      key: "issuing_office",
      label: "Issuing Office",
      aiValue: "Sub-Registrar, Whitefield, Bangalore Urban",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Office of the Sub-Registrar : WHITEFIELD, BANGALORE URBAN",
    },
  ],
  approvedFieldKeys: ["period_searched", "form_type", "entry_count"],
};

const P1_KHATA: SeedDocument = {
  id: "doc-1004",
  propertyId: "prop-1",
  fileName: "eKhata_Extract_BBMP_Flat402.pdf",
  docType: "khata",
  docTypeConfidence: 0.97,
  uploadedAt: "2026-08-14T09:24:00.000Z",
  uploadedBy: "Vinay Kumar S",
  sizeBytes: 642_113,
  pages: [
    {
      page: 1,
      text: `BRUHAT BENGALURU MAHANAGARA PALIKE
e-AASTHI / e-KHATA EXTRACT
(Digitally signed record — verify at bbmpeaasthi.karnataka.gov.in)

Khata Number                  : 82-45-1204/402
Property Identification (PID) : 82-45-1204
SAS Base Application Number   : 4302011455
Khata Classification          : A-KHATA

Owner Name                    : S. VINAY KUMAR
Father / Guardian             : SRINIVASA MURTHY

Ward Number / Name            : 84 — HAGADUR
Zone                          : MAHADEVAPURA
Property Address              : FLAT NO 402, 4TH FLOOR, A BLOCK,
                                BRIGADE LAKEVIEW APARTMENTS,
                                KADUGODI, BENGALURU - 560 067

Site Dimensions               : Undivided share in Sy. No. 42/3
Built-up Area                 : 1485 SQ FT
Usage                         : RESIDENTIAL (SELF OCCUPIED)
Year of Construction          : 2011
Annual Rateable Value         : Rs. 2,14,650
Khata Transferred On          : 11/06/2019
Transfer Reference            : Sale Deed BNG-1-04521/2019-20

This extract reflects the entries in the municipal register as on the date of
generation and is issued for taxation and civic record purposes.`,
    },
  ],
  fields: [
    {
      key: "owner_name",
      label: "Owner Name",
      aiValue: "S. VINAY KUMAR",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Owner Name : S. VINAY KUMAR",
    },
    {
      key: "khata_number",
      label: "Khata Number",
      aiValue: "82-45-1204/402",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Khata Number : 82-45-1204/402",
    },
    {
      key: "pid",
      label: "PID",
      aiValue: "82-45-1204",
      aiConfidence: 0.98,
      page: 1,
      snippet: "Property Identification (PID) : 82-45-1204",
    },
    {
      key: "sas_number",
      label: "SAS Application Number",
      aiValue: "4302011455",
      aiConfidence: 0.98,
      page: 1,
      snippet: "SAS Base Application Number : 4302011455",
    },
    {
      key: "khata_class",
      label: "Khata Classification",
      aiValue: "A-KHATA",
      aiConfidence: 0.99,
      page: 1,
      snippet: "Khata Classification : A-KHATA",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Sy. No. 42/3",
      aiConfidence: 0.89,
      page: 1,
      snippet: "Site Dimensions : Undivided share in Sy. No. 42/3",
    },
    {
      key: "extent",
      label: "Built-up Area",
      aiValue: "1485 SQ FT",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Built-up Area : 1485 SQ FT",
    },
    {
      key: "transfer_reference",
      label: "Transfer Reference",
      aiValue: "Sale Deed BNG-1-04521/2019-20",
      aiConfidence: 0.93,
      page: 1,
      snippet: "Transfer Reference : Sale Deed BNG-1-04521/2019-20",
    },
  ],
  approvedFieldKeys: ["khata_number", "pid", "sas_number", "khata_class"],
};

const P1_TAX: SeedDocument = {
  id: "doc-1005",
  propertyId: "prop-1",
  fileName: "BBMP_Tax_Receipt_2025-26.pdf",
  docType: "tax_receipt",
  docTypeConfidence: 0.99,
  uploadedAt: "2026-08-14T09:26:00.000Z",
  uploadedBy: "Vinay Kumar S",
  sizeBytes: 214_882,
  pages: [
    {
      page: 1,
      text: `BRUHAT BENGALURU MAHANAGARA PALIKE
SELF ASSESSMENT SCHEME — PROPERTY TAX PAID RECEIPT
Assessment Year : 2025-2026

Application Number (SAS)  : 4302011455
PID Number                : 82-45-1204
Owner Name                : VINAY KUMAR
Property Address          : FLAT 402, A BLOCK, BRIGADE LAKEVIEW APARTMENTS,
                            KADUGODI, WARD 84 HAGADUR, BENGALURU 560067

Zone : MAHADEVAPURA          Category : RESIDENTIAL — SELF OCCUPIED

COMPUTATION
  Property Tax                        Rs. 17,540.00
  Cess (24%)                          Rs.  4,209.60
  Gross Payable                       Rs. 21,749.60
  Rebate for full payment (5%)        Rs.  1,087.48
  Interest / Penalty                  Rs.      0.00
  NET AMOUNT PAID                     Rs. 20,662.00

Payment Mode        : NET BANKING (HDFC BANK)
Transaction ID      : BBMP2025PT0091447712
Payment Reference   : 4302011455-2025-1
Date of Payment     : 22/04/2025
Receipt Number      : PTR/2025-26/84/0338215

This is a computer generated receipt and does not require a signature.`,
    },
  ],
  fields: [
    {
      key: "assessment_year",
      label: "Assessment Year",
      aiValue: "2025-2026",
      aiConfidence: 0.99,
      page: 1,
      snippet: "Assessment Year : 2025-2026",
    },
    {
      key: "sas_number",
      label: "SAS Application Number",
      aiValue: "4302011455",
      aiConfidence: 0.99,
      page: 1,
      snippet: "Application Number (SAS) : 4302011455",
    },
    {
      key: "pid",
      label: "PID",
      aiValue: "82-45-1204",
      aiConfidence: 0.98,
      page: 1,
      snippet: "PID Number : 82-45-1204",
    },
    {
      // The tax roll dropped the family initial that appears on the deed and the
      // khata. This is ordinary in municipal records and it is what produces the
      // NAME_VARIANT finding on RV-000001: close enough to be the same person,
      // different enough that the platform refuses to merge them on its own.
      key: "owner_name",
      label: "Owner Name",
      aiValue: "VINAY KUMAR",
      aiConfidence: 0.94,
      page: 1,
      snippet: "Owner Name : VINAY KUMAR",
    },
    {
      key: "amount_paid",
      label: "Net Amount Paid",
      aiValue: "Rs. 20,662.00",
      aiConfidence: 0.98,
      page: 1,
      snippet: "NET AMOUNT PAID Rs. 20,662.00",
    },
    {
      key: "payment_date",
      label: "Date of Payment",
      aiValue: "22/04/2025",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Date of Payment : 22/04/2025",
    },
    {
      key: "receipt_number",
      label: "Receipt Number",
      aiValue: "PTR/2025-26/84/0338215",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Receipt Number : PTR/2025-26/84/0338215",
    },
  ],
  approvedFieldKeys: ["assessment_year", "sas_number", "amount_paid"],
};

const P1_PLAN: SeedDocument = {
  id: "doc-1006",
  propertyId: "prop-1",
  fileName: "Sanctioned_Plan_Brigade_Lakeview_ABlock.pdf",
  docType: "building_plan",
  docTypeConfidence: 0.86,
  uploadedAt: "2026-08-14T09:31:00.000Z",
  uploadedBy: "Vinay Kumar S",
  sizeBytes: 8_442_190,
  pages: [
    {
      page: 1,
      text: `BRUHAT BENGALURU MAHANAGARA PALIKE
PLAN SANCTION / COMMENCEMENT CERTIFICATE

Sanction Number        : BBMP/Adn.Com/JD.MHD/0412/2007-08
Date of Sanction       : 19/09/2007
Applicant / Developer  : Brigade Lakeview Developers Pvt Ltd
Land Reference         : Survey No. 42/3, Kadugodi Village, Varthur Hobli
Plot Area              : 1 Acre 12 Guntas
Sanctioned Floors      : Ground + 4 Upper Floors (A, B and C Blocks)
Sanctioned Units       : 96 residential apartments
Permissible FAR        : 1.75
Setbacks               : As per Zoning Regulations 2007

Note: This sanction is valid for commencement of construction and does not by
itself certify completion or fitness for occupation.`,
    },
  ],
  fields: [
    {
      key: "sanction_number",
      label: "Sanction Number",
      aiValue: "BBMP/Adn.Com/JD.MHD/0412/2007-08",
      aiConfidence: 0.9,
      page: 1,
      snippet: "Sanction Number : BBMP/Adn.Com/JD.MHD/0412/2007-08",
    },
    {
      key: "sanction_date",
      label: "Date of Sanction",
      aiValue: "19/09/2007",
      aiConfidence: 0.94,
      page: 1,
      snippet: "Date of Sanction : 19/09/2007",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 42/3",
      aiConfidence: 0.87,
      page: 1,
      snippet: "Land Reference : Survey No. 42/3, Kadugodi Village",
    },
    {
      key: "sanctioned_units",
      label: "Sanctioned Units",
      aiValue: "96 residential apartments",
      aiConfidence: 0.82,
      page: 1,
      snippet: "Sanctioned Units : 96 residential apartments",
    },
  ],
};

/* ================================================================ RV-000002 */
/* Agricultural land, Devanahalli. Deliberately problematic.                   */

const P2_SALE_DEED: SeedDocument = {
  id: "doc-2001",
  propertyId: "prop-2",
  fileName: "Sale_Deed_Sy118-2_Chikkajala_2013.pdf",
  docType: "sale_deed",
  docTypeConfidence: 0.95,
  uploadedAt: "2026-08-20T06:40:00.000Z",
  uploadedBy: "Adv. Meera Raghavan",
  sizeBytes: 5_118_770,
  pages: [
    {
      page: 1,
      text: `DEED OF ABSOLUTE SALE

EXECUTED ON THIS THE ELEVENTH DAY OF OCTOBER, TWO THOUSAND THIRTEEN
(11/10/2013) AT DEVANAHALLI, BANGALORE RURAL DISTRICT

BY
Mr. MUNIVENKATAPPA
Aged about 61 years, Son of Late Mr. Chikkanna
PAN: AGJPM4471N
Residing at Chikkajala Village, Jala Hobli, Bangalore North Taluk - 562 157

Hereinafter the "VENDOR"

IN FAVOUR OF
Mrs. LAKSHMAMMA
Aged about 48 years, Wife of Mr. Narayanaswamy
PAN: BLTPL9920F
Residing at No. 44, Bagalur Cross, Jala Hobli, Bangalore - 562 149

Hereinafter the "PURCHASER"`,
    },
    {
      page: 2,
      text: `RECITALS

WHEREAS the Vendor became the absolute owner of the Schedule Property by
virtue of a registered DEED OF PARTITION dated 14/05/2008 registered as
Document No. BNG-4-01187/2008-09 in the office of the Sub-Registrar,
Devanahalli, whereunder the Schedule Property was allotted to the share of
the Vendor upon partition of the joint family properties of the late
Chikkanna.

AND WHEREAS the Vendor has been in continuous possession and enjoyment of the
Schedule Property and the revenue records stand in his name.

AND WHEREAS the Vendor has agreed to sell the Schedule Property for a total
consideration of Rs. 46,00,000/- (Rupees Forty Six Lakhs only), the entire
amount having been received by demand draft No. 447712 dated 11/10/2013 drawn
on Syndicate Bank, Devanahalli Branch.`,
    },
    {
      page: 3,
      text: `SCHEDULE OF THE PROPERTY

All that piece and parcel of agricultural land bearing Survey Number 118/2,
situated at Chikkajala Village, Jala Hobli, Bangalore North Taluk,
Bangalore Rural District, measuring 2 Acres 20 Guntas, including Kharab of
8 Guntas, and bounded as under:

  EAST  : Land bearing Sy. No. 118/1 belonging to Krishnappa
  WEST  : Land bearing Sy. No. 119 belonging to Govindamma
  NORTH : Village cart track
  SOUTH : Land bearing Sy. No. 117/3 belonging to Anjinappa

REGISTRATION PARTICULARS
  Document No.         : BNG-4-05512/2013-14
  Date of Registration : 11/10/2013
  Sub-Registrar Office : Devanahalli, Bangalore Rural District
  Market Value         : Rs. 44,10,000/-
  Stamp Duty Paid      : Rs. 2,53,000/-
  Registration Fee     : Rs. 46,000/-`,
    },
  ],
  fields: [
    {
      key: "vendor_name",
      label: "Vendor",
      aiValue: "Munivenkatappa",
      aiConfidence: 0.95,
      page: 1,
      snippet: "BY Mr. MUNIVENKATAPPA Aged about 61 years, Son of Late Mr. Chikkanna",
    },
    {
      key: "purchaser_name",
      label: "Purchaser",
      aiValue: "Lakshmamma",
      aiConfidence: 0.96,
      page: 1,
      snippet: "IN FAVOUR OF Mrs. LAKSHMAMMA Aged about 48 years",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey Number 118/2",
      aiConfidence: 0.93,
      page: 3,
      snippet:
        "agricultural land bearing Survey Number 118/2, situated at Chikkajala Village",
    },
    {
      key: "extent",
      label: "Extent",
      aiValue: "2 Acres 20 Guntas",
      aiConfidence: 0.88,
      page: 3,
      snippet: "measuring 2 Acres 20 Guntas, including Kharab of 8 Guntas",
    },
    {
      key: "consideration",
      label: "Consideration",
      aiValue: "Rs. 46,00,000",
      aiConfidence: 0.96,
      page: 2,
      snippet: "a total consideration of Rs. 46,00,000/- (Rupees Forty Six Lakhs only)",
    },
    {
      key: "registration_number",
      label: "Document Number",
      aiValue: "BNG-4-05512/2013-14",
      aiConfidence: 0.94,
      page: 3,
      snippet: "Document No. : BNG-4-05512/2013-14",
    },
    {
      key: "registration_date",
      label: "Date of Registration",
      aiValue: "11/10/2013",
      aiConfidence: 0.97,
      page: 3,
      snippet: "Date of Registration : 11/10/2013",
    },
    {
      key: "parent_document",
      label: "Parent Document Cited",
      aiValue: "Deed of Partition BNG-4-01187/2008-09 dated 14/05/2008",
      aiConfidence: 0.9,
      page: 2,
      snippet:
        "DEED OF PARTITION dated 14/05/2008 registered as Document No. BNG-4-01187/2008-09",
    },
    {
      key: "village",
      label: "Village / Hobli",
      aiValue: "Chikkajala Village, Jala Hobli",
      aiConfidence: 0.92,
      page: 3,
      snippet: "situated at Chikkajala Village, Jala Hobli, Bangalore North Taluk",
    },
  ],
  approvedFieldKeys: ["vendor_name", "purchaser_name", "registration_number"],
};

const P2_RTC: SeedDocument = {
  id: "doc-2002",
  propertyId: "prop-2",
  fileName: "RTC_Pahani_Sy118-2_Chikkajala.pdf",
  docType: "rtc",
  docTypeConfidence: 0.96,
  uploadedAt: "2026-08-20T06:44:00.000Z",
  uploadedBy: "Adv. Meera Raghavan",
  sizeBytes: 388_442,
  pages: [
    {
      page: 1,
      text: `GOVERNMENT OF KARNATAKA — DEPARTMENT OF REVENUE
BHOOMI — RECORD OF RIGHTS, TENANCY AND CROPS (RTC / PAHANI)

District : BANGALORE RURAL      Taluk  : BANGALORE NORTH
Hobli    : JALA                 Village: CHIKKAJALA
Survey Number : 118    Hissa Number : 2
Year     : 2025-2026

LAND PARTICULARS
  Total Extent           : 2 Acres 15 Guntas
  Kharab (Class A)       : 0 Acres 08 Guntas
  Cultivable Extent      : 2 Acres 07 Guntas
  Land Classification    : DRY LAND (KHUSHKI)
  Soil Type              : RED SANDY LOAM
  Assessment (Land Rev.) : Rs. 14.60

OWNERSHIP / KHATEDAR DETAILS
  Sl 1  Owner Name : LAKSHMAMMA W/O NARAYANASWAMY
        Share      : 1/1 (Full)
        Extent     : 2 Acres 15 Guntas
        Mutation Register No. : MR 47/2013-14
        Nature of Acquisition : SALE

CROP DETAILS
  2024-25 Kharif : RAGI        Irrigation : RAINFED
  2024-25 Rabi   : FALLOW
  2025-26 Kharif : RAGI        Irrigation : RAINFED

OTHER RIGHTS / ENCUMBRANCES NOTED IN REVENUE RECORD
  Charge noted in favour of KARNATAKA GRAMIN BANK, BAGALUR BRANCH
  vide entry dated 03/02/2020 — agricultural term loan.

Signature : Deputy Tahsildar, Bangalore North Taluk (digitally signed)`,
    },
  ],
  fields: [
    {
      key: "owner_name",
      label: "Khatedar / Owner",
      aiValue: "LAKSHMAMMA W/O NARAYANASWAMY",
      aiConfidence: 0.94,
      page: 1,
      snippet: "Sl 1 Owner Name : LAKSHMAMMA W/O NARAYANASWAMY  Share : 1/1 (Full)",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "118/2",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Survey Number : 118    Hissa Number : 2",
    },
    {
      key: "extent",
      label: "Total Extent",
      aiValue: "2 Acres 15 Guntas",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Total Extent : 2 Acres 15 Guntas",
    },
    {
      key: "kharab",
      label: "Kharab",
      aiValue: "0 Acres 08 Guntas",
      aiConfidence: 0.93,
      page: 1,
      snippet: "Kharab (Class A) : 0 Acres 08 Guntas",
    },
    {
      key: "land_classification",
      label: "Land Classification",
      aiValue: "DRY LAND (KHUSHKI)",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Land Classification : DRY LAND (KHUSHKI)",
    },
    {
      key: "mutation_number",
      label: "Mutation Register No.",
      aiValue: "MR 47/2013-14",
      aiConfidence: 0.91,
      page: 1,
      snippet: "Mutation Register No. : MR 47/2013-14",
    },
    {
      key: "revenue_charge",
      label: "Charge Noted in Revenue Record",
      aiValue: "Karnataka Gramin Bank, Bagalur Branch — entry dated 03/02/2020",
      aiConfidence: 0.87,
      page: 1,
      snippet:
        "Charge noted in favour of KARNATAKA GRAMIN BANK, BAGALUR BRANCH vide entry dated 03/02/2020",
    },
    {
      key: "village",
      label: "Village / Hobli",
      aiValue: "CHIKKAJALA, JALA Hobli",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Hobli : JALA                 Village: CHIKKAJALA",
    },
  ],
  approvedFieldKeys: ["survey_number", "land_classification"],
};

const P2_EC: SeedDocument = {
  id: "doc-2003",
  propertyId: "prop-2",
  fileName: "EC_Form15_Sy118-2A_1998_to_2026.pdf",
  docType: "encumbrance_certificate",
  docTypeConfidence: 0.98,
  uploadedAt: "2026-08-20T06:52:00.000Z",
  uploadedBy: "Adv. Meera Raghavan",
  sizeBytes: 1_442_006,
  pages: [
    {
      page: 1,
      text: `GOVERNMENT OF KARNATAKA
DEPARTMENT OF STAMPS AND REGISTRATION
CERTIFICATE OF ENCUMBRANCE ON PROPERTY — FORM No. 15

Office of the Sub-Registrar : DEVANAHALLI, BANGALORE RURAL
Period of Search           : 01/04/1998 to 31/03/2026
Applicant                  : Meera Raghavan, Advocate
Application No.            : EC/DVH/2026/0011907
Date of Issue              : 12/08/2026

PROPERTY DESCRIPTION AS PER APPLICATION
Agricultural land bearing Survey No. 118/2A, Chikkajala Village, Jala Hobli,
Bangalore North Taluk, measuring 2 Acres 20 Guntas.`,
    },
    {
      page: 2,
      text: `ENTRIES FOUND FOR THE PERIOD OF SEARCH

Sl. 1
  Nature of Deed      : DEED OF PARTITION
  Document No.        : BNG-4-01187/2008-09
  Date of Registration: 14/05/2008
  Executant           : Legal heirs of Late Chikkanna
  Claimant            : Munivenkatappa and others
  Volume / Page       : 0714 / 118-140

Sl. 2
  Nature of Deed      : SALE DEED
  Document No.        : BNG-4-05512/2013-14
  Date of Registration: 11/10/2013
  Executant           : Munivenkatappa
  Claimant            : Lakshmamma
  Consideration       : Rs. 46,00,000/-
  Volume / Page       : 1122 / 401-418

Sl. 3
  Nature of Deed      : DEED OF SIMPLE MORTGAGE
  Document No.        : BNG-4-00844/2020-21
  Date of Registration: 03/02/2020
  Executant           : Lakshmamma
  Claimant            : Karnataka Gramin Bank, Bagalur Branch
  Amount Secured      : Rs. 18,00,000/-
  Volume / Page       : 1508 / 077-088

No deed of release or discharge in respect of the mortgage at Sl. 3 was
traced in the records of this office up to the end of the period of search.`,
    },
  ],
  fields: [
    {
      key: "period_searched",
      label: "Period of Search",
      aiValue: "01/04/1998 to 31/03/2026",
      aiConfidence: 0.98,
      page: 1,
      snippet: "Period of Search : 01/04/1998 to 31/03/2026",
    },
    {
      key: "form_type",
      label: "Form",
      aiValue: "Form 15 (encumbrances found)",
      aiConfidence: 0.97,
      page: 1,
      snippet: "CERTIFICATE OF ENCUMBRANCE ON PROPERTY — FORM No. 15",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 118/2A",
      aiConfidence: 0.79,
      page: 1,
      snippet:
        "Agricultural land bearing Survey No. 118/2A, Chikkajala Village, Jala Hobli",
    },
    {
      key: "extent",
      label: "Extent",
      aiValue: "2 Acres 20 Guntas",
      aiConfidence: 0.84,
      page: 1,
      snippet: "measuring 2 Acres 20 Guntas",
    },
    {
      key: "entry_count",
      label: "Entries Found",
      aiValue: "3",
      aiConfidence: 0.96,
      page: 2,
      snippet: "Sl. 1 ... Sl. 2 ... Sl. 3",
    },
    {
      key: "latest_owner",
      label: "Most Recent Claimant",
      aiValue: "Lakshmamma",
      aiConfidence: 0.93,
      page: 2,
      snippet: "Claimant : Lakshmamma  Consideration : Rs. 46,00,000/-",
    },
    {
      key: "open_mortgage",
      label: "Unreleased Charge",
      aiValue:
        "Simple mortgage BNG-4-00844/2020-21 in favour of Karnataka Gramin Bank — no release traced",
      aiConfidence: 0.92,
      page: 2,
      snippet:
        "No deed of release or discharge in respect of the mortgage at Sl. 3 was traced",
    },
    {
      key: "issuing_office",
      label: "Issuing Office",
      aiValue: "Sub-Registrar, Devanahalli, Bangalore Rural",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Office of the Sub-Registrar : DEVANAHALLI, BANGALORE RURAL",
    },
  ],
  approvedFieldKeys: ["period_searched", "form_type"],
};

const P2_TAX: SeedDocument = {
  id: "doc-2004",
  propertyId: "prop-2",
  fileName: "Land_Revenue_Receipt_2023-24.pdf",
  docType: "tax_receipt",
  docTypeConfidence: 0.81,
  uploadedAt: "2026-08-20T06:55:00.000Z",
  uploadedBy: "Adv. Meera Raghavan",
  sizeBytes: 176_004,
  pages: [
    {
      page: 1,
      text: `OFFICE OF THE VILLAGE ACCOUNTANT, CHIKKAJALA
LAND REVENUE PAYMENT RECEIPT

Assessment Year   : 2023-2024
Village           : CHIKKAJALA        Hobli : JALA
Survey / Hissa No : 118/2
Khatedar          : LAKSHMAMMA W/O NARAYANASWAMY
Extent            : 2 Acres 15 Guntas
Land Revenue Due  : Rs. 14.60
Cess              : Rs. 2.20
Total Paid        : Rs. 16.80
Receipt No.       : VA/CKJ/2023-24/00412
Date of Payment   : 09/01/2024

Received by : Village Accountant, Chikkajala`,
    },
  ],
  fields: [
    {
      key: "assessment_year",
      label: "Assessment Year",
      aiValue: "2023-2024",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Assessment Year   : 2023-2024",
    },
    {
      key: "owner_name",
      label: "Khatedar",
      aiValue: "LAKSHMAMMA W/O NARAYANASWAMY",
      aiConfidence: 0.92,
      page: 1,
      snippet: "Khatedar          : LAKSHMAMMA W/O NARAYANASWAMY",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "118/2",
      aiConfidence: 0.94,
      page: 1,
      snippet: "Survey / Hissa No : 118/2",
    },
    {
      key: "amount_paid",
      label: "Total Paid",
      aiValue: "Rs. 16.80",
      aiConfidence: 0.9,
      page: 1,
      snippet: "Total Paid        : Rs. 16.80",
    },
    {
      key: "payment_date",
      label: "Date of Payment",
      aiValue: "09/01/2024",
      aiConfidence: 0.93,
      page: 1,
      snippet: "Date of Payment   : 09/01/2024",
    },
    {
      key: "receipt_number",
      label: "Receipt Number",
      aiValue: "VA/CKJ/2023-24/00412",
      aiConfidence: 0.88,
      page: 1,
      snippet: "Receipt No.       : VA/CKJ/2023-24/00412",
    },
  ],
};

/* ================================================================ RV-000003 */
/* Converted residential plot, Sarjapur. The "nothing to action" case.         */

const P3_SALE_DEED: SeedDocument = {
  id: "doc-3001",
  propertyId: "prop-3",
  fileName: "Sale_Deed_Site17_Sarjapur_2021.pdf",
  docType: "sale_deed",
  docTypeConfidence: 0.97,
  uploadedAt: "2026-08-28T11:02:00.000Z",
  uploadedBy: "Priya Nair",
  sizeBytes: 3_918_442,
  pages: [
    {
      page: 1,
      text: `DEED OF ABSOLUTE SALE
EXECUTED ON 05/02/2021 AT BANGALORE

BY: GREENFIELD SHELTERS LLP, LLPIN AAF-9921,
    represented by Designated Partner Mr. Anil Kumar Jain,
    No. 402, Prestige Centre Point, Cunningham Road, Bangalore - 560 052
    ("VENDOR")

IN FAVOUR OF: Mrs. PRIYA NAIR,
    aged about 36 years, W/o Mr. Rahul Nair,
    PAN: CJVPN7741R,
    No. 9, Palm Meadows, Whitefield, Bangalore - 560 066
    ("PURCHASER")

Total sale consideration : Rs. 1,12,00,000/- (Rupees One Crore Twelve Lakhs only)
Paid by RTGS UTR ICICR2021020500881 dated 05/02/2021.`,
    },
    {
      page: 2,
      text: `SCHEDULE OF THE PROPERTY

Residential Site bearing No. 17, formed in the approved layout known as
"GREENFIELD MEADOWS", on land converted from agricultural use bearing
Survey No. 67/4 of Kachamaranahalli Village, Sarjapur Hobli, Anekal Taluk,
Bangalore Urban District, measuring East to West 40 feet and North to South
60 feet, in all admeasuring 2,400 Sq. Ft.

BOUNDED BY:
  EAST  : Site No. 18
  WEST  : Site No. 16
  NORTH : 30 feet wide layout road
  SOUTH : Site No. 32

REGISTRATION PARTICULARS
  Document No.         : BNG-6-00817/2021-22
  Date of Registration : 05/02/2021
  Sub-Registrar Office : Sarjapur, Bangalore Urban District
  Market Value         : Rs. 1,08,00,000/-
  Stamp Duty Paid      : Rs. 6,16,000/-
  Registration Fee     : Rs. 1,12,000/-

The Vendor derived title under Sale Deed BNG-6-04412/2016-17 dated 30/11/2016
and the land was converted for residential use vide order
ALN/CNV/SR/44/2017-18 dated 21/08/2017 of the Deputy Commissioner,
Bangalore Urban District. Layout approval BMRDA/LAO/1180/2018-19.`,
    },
  ],
  fields: [
    {
      key: "vendor_name",
      label: "Vendor",
      aiValue: "Greenfield Shelters LLP",
      aiConfidence: 0.96,
      page: 1,
      snippet: "BY: GREENFIELD SHELTERS LLP, LLPIN AAF-9921",
    },
    {
      key: "purchaser_name",
      label: "Purchaser",
      aiValue: "Priya Nair",
      aiConfidence: 0.98,
      page: 1,
      snippet: "IN FAVOUR OF: Mrs. PRIYA NAIR, aged about 36 years",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 67/4",
      aiConfidence: 0.95,
      page: 2,
      snippet:
        "bearing Survey No. 67/4 of Kachamaranahalli Village, Sarjapur Hobli",
    },
    {
      key: "extent",
      label: "Extent",
      aiValue: "2,400 Sq. Ft.",
      aiConfidence: 0.96,
      page: 2,
      snippet: "in all admeasuring 2,400 Sq. Ft.",
    },
    {
      key: "consideration",
      label: "Consideration",
      aiValue: "Rs. 1,12,00,000",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Total sale consideration : Rs. 1,12,00,000/-",
    },
    {
      key: "registration_number",
      label: "Document Number",
      aiValue: "BNG-6-00817/2021-22",
      aiConfidence: 0.96,
      page: 2,
      snippet: "Document No. : BNG-6-00817/2021-22",
    },
    {
      key: "registration_date",
      label: "Date of Registration",
      aiValue: "05/02/2021",
      aiConfidence: 0.98,
      page: 2,
      snippet: "Date of Registration : 05/02/2021",
    },
    {
      key: "parent_document",
      label: "Parent Document Cited",
      aiValue: "BNG-6-04412/2016-17 dated 30/11/2016",
      aiConfidence: 0.92,
      page: 2,
      snippet:
        "The Vendor derived title under Sale Deed BNG-6-04412/2016-17 dated 30/11/2016",
    },
    {
      key: "village",
      label: "Village / Hobli",
      aiValue: "Kachamaranahalli Village, Sarjapur Hobli",
      aiConfidence: 0.94,
      page: 2,
      snippet: "of Kachamaranahalli Village, Sarjapur Hobli, Anekal Taluk",
    },
  ],
  // RV-000003 is the "nothing to action" case, so its extraction is fully
  // signed off. That is what lets it reach the assembled readiness band.
  approvedFieldKeys: [
    "vendor_name",
    "purchaser_name",
    "survey_number",
    "extent",
    "registration_number",
    "registration_date",
    "consideration",
    "parent_document",
    "village",
  ],
};

const P3_EC: SeedDocument = {
  id: "doc-3002",
  propertyId: "prop-3",
  fileName: "EC_Form16_Site17_2015_to_2026.pdf",
  docType: "encumbrance_certificate",
  docTypeConfidence: 0.98,
  uploadedAt: "2026-08-28T11:06:00.000Z",
  uploadedBy: "Priya Nair",
  sizeBytes: 604_118,
  pages: [
    {
      page: 1,
      text: `GOVERNMENT OF KARNATAKA
DEPARTMENT OF STAMPS AND REGISTRATION
CERTIFICATE OF ENCUMBRANCE ON PROPERTY — FORM No. 16
(Nil Encumbrance Certificate)

Office of the Sub-Registrar : SARJAPUR, BANGALORE URBAN
Period of Search           : 01/04/2015 to 31/03/2026
Applicant                  : Priya Nair
Application No.            : EC/SJP/2026/0028841
Date of Issue              : 20/08/2026

PROPERTY DESCRIPTION AS PER APPLICATION
Site No. 17, Greenfield Meadows Layout, Survey No. 67/4, Kachamaranahalli
Village, Sarjapur Hobli, Anekal Taluk, measuring 2,400 Sq. Ft.

ENTRIES
  Sl. 1  SALE DEED  BNG-6-04412/2016-17  dated 30/11/2016
         Executant : Chandrashekar M. and others
         Claimant  : Greenfield Shelters LLP

  Sl. 2  SALE DEED  BNG-6-00817/2021-22  dated 05/02/2021
         Executant : Greenfield Shelters LLP
         Claimant  : Priya Nair
         Consideration : Rs. 1,12,00,000/-

No mortgage, lease, attachment, court injunction or other encumbrance was
traced against the said property for the period of search.`,
    },
  ],
  fields: [
    {
      key: "period_searched",
      label: "Period of Search",
      aiValue: "01/04/2015 to 31/03/2026",
      aiConfidence: 0.98,
      page: 1,
      snippet: "Period of Search : 01/04/2015 to 31/03/2026",
    },
    {
      key: "form_type",
      label: "Form",
      aiValue: "Form 16 (nil encumbrance)",
      aiConfidence: 0.97,
      page: 1,
      snippet:
        "CERTIFICATE OF ENCUMBRANCE ON PROPERTY — FORM No. 16 (Nil Encumbrance Certificate)",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 67/4",
      aiConfidence: 0.94,
      page: 1,
      snippet: "Site No. 17, Greenfield Meadows Layout, Survey No. 67/4",
    },
    {
      key: "entry_count",
      label: "Entries Found",
      aiValue: "2",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Sl. 1  SALE DEED ... Sl. 2  SALE DEED",
    },
    {
      key: "latest_owner",
      label: "Most Recent Claimant",
      aiValue: "Priya Nair",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Claimant  : Priya Nair  Consideration : Rs. 1,12,00,000/-",
    },
    {
      key: "open_mortgage",
      label: "Unreleased Charge",
      aiValue: "None traced for the period of search",
      aiConfidence: 0.94,
      page: 1,
      snippet:
        "No mortgage, lease, attachment, court injunction or other encumbrance was traced",
    },
  ],
  approvedFieldKeys: [
    "period_searched",
    "form_type",
    "open_mortgage",
    "survey_number",
    "entry_count",
    "latest_owner",
  ],
};

const P3_KHATA: SeedDocument = {
  id: "doc-3003",
  propertyId: "prop-3",
  fileName: "eKhata_Site17_Greenfield_Meadows.pdf",
  docType: "khata",
  docTypeConfidence: 0.96,
  uploadedAt: "2026-08-28T11:09:00.000Z",
  uploadedBy: "Priya Nair",
  sizeBytes: 512_770,
  pages: [
    {
      page: 1,
      text: `e-AASTHI / e-KHATA EXTRACT
GRAMA PANCHAYAT KACHAMARANAHALLI / ANEKAL TALUK PANCHAYAT

Khata Number                : 67-4-017
Property Identification (PID): AK-SJP-67-4-017
e-Swathu Property ID        : ESW-29-118-0417
Khata Classification        : A-KHATA

Owner Name                  : PRIYA NAIR
Spouse                      : RAHUL NAIR

Property Address            : SITE NO 17, GREENFIELD MEADOWS LAYOUT,
                              KACHAMARANAHALLI, SARJAPUR HOBLI,
                              ANEKAL TALUK - 562 125
Site Area                   : 2400 SQ FT
Usage                       : RESIDENTIAL — VACANT SITE
Annual Rateable Value       : Rs. 96,000
Khata Registered On         : 18/03/2021
Transfer Reference          : Sale Deed BNG-6-00817/2021-22
Layout Approval             : BMRDA/LAO/1180/2018-19
Conversion Order            : ALN/CNV/SR/44/2017-18 dated 21/08/2017`,
    },
  ],
  fields: [
    {
      key: "owner_name",
      label: "Owner Name",
      aiValue: "PRIYA NAIR",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Owner Name : PRIYA NAIR",
    },
    {
      key: "khata_number",
      label: "Khata Number",
      aiValue: "67-4-017",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Khata Number : 67-4-017",
    },
    {
      key: "pid",
      label: "PID",
      aiValue: "AK-SJP-67-4-017",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Property Identification (PID): AK-SJP-67-4-017",
    },
    {
      key: "khata_class",
      label: "Khata Classification",
      aiValue: "A-KHATA",
      aiConfidence: 0.98,
      page: 1,
      snippet: "Khata Classification        : A-KHATA",
    },
    {
      key: "extent",
      label: "Site Area",
      aiValue: "2400 SQ FT",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Site Area                   : 2400 SQ FT",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "67/4",
      aiConfidence: 0.9,
      page: 1,
      snippet: "Khata Number : 67-4-017 ... SURVEY 67/4 layout reference",
    },
    {
      key: "transfer_reference",
      label: "Transfer Reference",
      aiValue: "Sale Deed BNG-6-00817/2021-22",
      aiConfidence: 0.94,
      page: 1,
      snippet: "Transfer Reference          : Sale Deed BNG-6-00817/2021-22",
    },
  ],
  approvedFieldKeys: [
    "owner_name",
    "khata_number",
    "khata_class",
    "extent",
    "pid",
    "survey_number",
    "transfer_reference",
  ],
};

const P3_CONVERSION: SeedDocument = {
  id: "doc-3004",
  propertyId: "prop-3",
  fileName: "Conversion_Order_ALN_CNV_SR_44_2017-18.pdf",
  docType: "conversion_order",
  docTypeConfidence: 0.94,
  uploadedAt: "2026-08-28T11:12:00.000Z",
  uploadedBy: "Priya Nair",
  sizeBytes: 902_004,
  pages: [
    {
      page: 1,
      text: `OFFICE OF THE DEPUTY COMMISSIONER, BANGALORE URBAN DISTRICT
ORDER OF CONVERSION OF AGRICULTURAL LAND FOR NON-AGRICULTURAL PURPOSE
(Under Section 95 of the Karnataka Land Revenue Act, 1964)

Order No.        : ALN/CNV/SR/44/2017-18
Date             : 21/08/2017
Applicant        : Greenfield Shelters LLP
Land             : Survey No. 67/4, Kachamaranahalli Village, Sarjapur Hobli,
                   Anekal Taluk
Extent Converted : 3 Acres 12 Guntas
Purpose          : RESIDENTIAL LAYOUT
Conversion Fine  : Rs. 18,72,000/- (paid vide challan 44118 dated 04/08/2017)

Permission is hereby granted subject to the conditions that the applicant
shall obtain layout approval from the competent planning authority, shall
relinquish the area required for roads and civic amenities, and shall commence
the non-agricultural use within two years from the date of this order.`,
    },
  ],
  fields: [
    {
      key: "order_number",
      label: "Order Number",
      aiValue: "ALN/CNV/SR/44/2017-18",
      aiConfidence: 0.95,
      page: 1,
      snippet: "Order No.        : ALN/CNV/SR/44/2017-18",
    },
    {
      key: "order_date",
      label: "Order Date",
      aiValue: "21/08/2017",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Date             : 21/08/2017",
    },
    {
      key: "survey_number",
      label: "Survey Number",
      aiValue: "Survey No. 67/4",
      aiConfidence: 0.94,
      page: 1,
      snippet: "Land             : Survey No. 67/4, Kachamaranahalli Village",
    },
    {
      key: "purpose",
      label: "Converted Purpose",
      aiValue: "RESIDENTIAL LAYOUT",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Purpose          : RESIDENTIAL LAYOUT",
    },
  ],
  approvedFieldKeys: ["order_number", "order_date", "purpose", "survey_number"],
};

const P3_TAX: SeedDocument = {
  id: "doc-3005",
  propertyId: "prop-3",
  fileName: "Panchayat_Tax_Receipt_2025-26.pdf",
  docType: "tax_receipt",
  docTypeConfidence: 0.97,
  uploadedAt: "2026-08-28T11:14:00.000Z",
  uploadedBy: "Priya Nair",
  sizeBytes: 188_220,
  pages: [
    {
      page: 1,
      text: `GRAMA PANCHAYAT KACHAMARANAHALLI
PROPERTY TAX PAID RECEIPT — ASSESSMENT YEAR 2025-2026

Khata Number      : 67-4-017
e-Swathu ID       : ESW-29-118-0417
Owner Name        : PRIYA NAIR
Property          : SITE NO 17, GREENFIELD MEADOWS LAYOUT
Site Area         : 2400 SQ FT
Usage             : VACANT RESIDENTIAL SITE

Property Tax      : Rs. 4,320.00
Library Cess      : Rs.   259.00
Beneficiary Cess  : Rs.   129.00
Total Paid        : Rs. 4,708.00

Receipt Number    : GPK/PT/2025-26/001188
Transaction Ref   : GPKPT2025041800188
Date of Payment   : 18/04/2025`,
    },
  ],
  fields: [
    {
      key: "assessment_year",
      label: "Assessment Year",
      aiValue: "2025-2026",
      aiConfidence: 0.98,
      page: 1,
      snippet: "PROPERTY TAX PAID RECEIPT — ASSESSMENT YEAR 2025-2026",
    },
    {
      key: "owner_name",
      label: "Owner Name",
      aiValue: "PRIYA NAIR",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Owner Name        : PRIYA NAIR",
    },
    {
      key: "khata_number",
      label: "Khata Number",
      aiValue: "67-4-017",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Khata Number      : 67-4-017",
    },
    {
      key: "amount_paid",
      label: "Total Paid",
      aiValue: "Rs. 4,708.00",
      aiConfidence: 0.97,
      page: 1,
      snippet: "Total Paid        : Rs. 4,708.00",
    },
    {
      key: "payment_date",
      label: "Date of Payment",
      aiValue: "18/04/2025",
      aiConfidence: 0.96,
      page: 1,
      snippet: "Date of Payment   : 18/04/2025",
    },
  ],
  approvedFieldKeys: [
    "assessment_year",
    "amount_paid",
    "owner_name",
    "khata_number",
    "payment_date",
  ],
};

export const SEED_DOCUMENTS: SeedDocument[] = [
  P1_SALE_DEED,
  P1_MOTHER_DEED,
  P1_EC,
  P1_KHATA,
  P1_TAX,
  P1_PLAN,
  P2_SALE_DEED,
  P2_RTC,
  P2_EC,
  P2_TAX,
  P3_SALE_DEED,
  P3_EC,
  P3_KHATA,
  P3_CONVERSION,
  P3_TAX,
];

/**
 * Files offered in the upload dialog so the demo can be driven without the user
 * having to supply a real PDF. Each one exercises a different path through the
 * pipeline.
 */
export interface UploadableSample {
  id: string;
  fileName: string;
  sizeBytes: number;
  docType: DocumentTypeId;
  /** What this upload is meant to demonstrate. */
  demonstrates: string;
  /** Pipeline outcome to simulate. */
  outcome: "clean" | "needs_review" | "duplicate" | "transient_failure";
  targetPropertyId?: string;
}

export const UPLOADABLE_SAMPLES: UploadableSample[] = [
  {
    id: "up-oc",
    fileName: "Occupancy_Certificate_Brigade_Lakeview_2011.pdf",
    sizeBytes: 1_204_882,
    docType: "occupancy_certificate",
    demonstrates:
      "Fills the missing document on RV-000001 and lifts its completeness score.",
    outcome: "clean",
    targetPropertyId: "prop-1",
  },
  {
    id: "up-dup",
    fileName: "EC_Form15_Flat402_2004_to_2026.pdf",
    sizeBytes: 1_104_220,
    docType: "encumbrance_certificate",
    demonstrates:
      "Byte-identical re-upload. Dedupe stage halts the pipeline before any AI cost is incurred.",
    outcome: "duplicate",
    targetPropertyId: "prop-1",
  },
  {
    id: "up-poor-scan",
    fileName: "Partition_Deed_2008_scanned_copy.pdf",
    sizeBytes: 6_884_112,
    docType: "mother_deed",
    demonstrates:
      "A weak photocopy. OCR confidence drops, fields land in the review queue instead of being trusted.",
    outcome: "needs_review",
  },
  {
    id: "up-flaky",
    fileName: "Loan_Sanction_Letter_HDFC.pdf",
    sizeBytes: 744_006,
    docType: "loan_sanction",
    demonstrates:
      "OCR provider times out on the first attempt. The stage retries on its own without restarting the document.",
    outcome: "transient_failure",
  },
];
