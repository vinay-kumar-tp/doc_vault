<div align="center">

# Real Estate Vault

**Property intelligence infrastructure for Indian real estate**

Turns fragmented property documents into a structured, evidence-backed property record, so professionals and buyers can understand risk before money changes hands.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7_strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/status-pre--MVP_demo-E8A33D)](#project-status)

</div>

---

> **This repository contains a running demo simulation.** Every screen works and the document-processing pipeline runs end to end. OCR and model inference are simulated; the architecture around them is not. See [What is real and what is simulated](#8-what-is-real-and-what-is-simulated) for a precise breakdown.

```bash
npm install
npm run dev        # → http://localhost:3000
```

No API keys. No database. No environment variables. Choose a role on the landing page and begin.

---

## Table of contents

1. [The problem](#1-the-problem)
2. [The approach](#2-the-approach)
3. [What this is not](#3-what-this-is-not)
4. [Quick start](#4-quick-start)
5. [Guided walkthrough](#5-guided-walkthrough)
6. [Feature reference](#6-feature-reference)
7. [The synthetic document corpus](#7-the-synthetic-document-corpus)
8. [What is real and what is simulated](#8-what-is-real-and-what-is-simulated)
9. [Architecture](#9-architecture)
10. [The ingestion pipeline](#10-the-ingestion-pipeline)
11. [The intelligence engines](#11-the-intelligence-engines)
12. [The reasoning layer](#12-the-reasoning-layer)
13. [Legal safety by construction](#13-legal-safety-by-construction)
14. [Design decisions and their rationale](#14-design-decisions-and-their-rationale)
15. [Data model](#15-data-model)
16. [Cost model](#16-cost-model)
17. [Roles and permissions](#17-roles-and-permissions)
18. [Project structure](#18-project-structure)
19. [Development](#19-development)
20. [Verification](#20-verification)
21. [Production path](#21-production-path)
22. [Known gaps](#22-known-gaps)
23. [Roadmap](#23-roadmap)
24. [Glossary](#24-glossary)
25. [Project status](#25-project-status)

---

## 1. The problem

A single property transaction in Bengaluru can involve eighty documents: sale deeds, mother deeds, encumbrance certificates, RTC extracts, khata records, tax receipts, sanctioned plans, occupancy certificates, conversion orders, NOCs and loan papers. They arrive as PDFs, WhatsApp forwards, email attachments and photocopies of photocopies, scattered across a buyer's inbox, a broker's phone and a lawyer's filing cabinet.

**Storing them is not the problem.** Cloud storage solved that a decade ago, and every proptech company offers a document locker.

The problem is that **nobody holds a single structured view of what those documents collectively say about the property.** Answering a question as basic as *"does the survey number in the sale deed match the one in the encumbrance certificate"* requires a human to open two files and compare strings by eye. Multiply that by every field, every document pair and every transaction, and you have the real cost of Indian property due diligence — measured in weeks of professional time and in the risk of what gets missed.

Government digitisation is improving access to individual records. Retrieval services are making documents easier to obtain. Legal-service firms offer one-off verification. What none of them provide is the **persistent intelligence layer that sits above all of it** and reconciles the pieces around the property itself.

## 2. The approach

```
Documents  →  Structured data  →  Relationships  →  Findings  →  Human verification
```

Four moves, strictly in order, each depending on the one before it.

### Documents become structured data

OCR, layout analysis and typed extraction turn a scanned sale deed into named fields. Every field carries a **page reference** and a **confidence score**. A field the model is not confident about does not silently enter the property record — it enters a review queue.

### Structured data becomes a graph

Identifiers are normalised *before* anything is compared. `Sy. No. 42/3A`, `42-3` and `Survey No 42/3` resolve to the same parcel. `Vinay Kumar S` and `S. Vinay Kumar` resolve to the same person, because a leading initial carries the same information as a trailing one. Ownership becomes something you can traverse rather than something a human infers by reading three PDFs side by side.

### The graph produces findings

Deterministic rules compare documents against each other and against a versioned checklist. **No model participates in this step.** Findings state observations — *"the schedule reads 118/2 while the certificate description reads 118/2A"* — and never conclusions.

### Findings stop short of legal advice

The platform describes what the documents say and where they disagree. Whether title is good is a legal determination, and it remains with a qualified professional. This is enforced **structurally rather than by instruction**: no type in the domain model is capable of expressing legal clearance.

## 3. What this is not

| Not | Because |
|---|---|
| Cloud storage for property PDFs | Storage is the entry point, not the product |
| A property marketplace | The information layer is the defensible position, not listings |
| An AI lawyer | It will explicitly refuse to give a legal opinion |
| A replacement for government records | It organises and reconciles permitted sources; it is not an authority |
| A title guarantee | It reports on documents supplied to it, and says so on every screen |

---

## 4. Quick start

**Requirements:** Node.js 20 or later. Verified on Node 25.8 with npm 11.12.

```bash
git clone https://github.com/vinay-kumar-tp/doc_vault.git
cd doc_vault
npm install
npm run dev
```

Open http://localhost:3000.

State is held in memory and persisted to `localStorage`, so your progress survives a reload. The **Reset** button in the sidebar discards everything and restores the seeded state.

---

## 5. Guided walkthrough

Three properties are seeded and already processed. They were chosen to demonstrate three distinct states of a real property file.

| Property | Type | Readiness | Completeness | Findings | Demonstrates |
|---|---|---|---|---|---|
| **RV-000001** | Apartment · Kadugodi, Whitefield | Reviewer action | 83% (5/6) | 3 attention, 1 info | A normal, mostly complete file. The Occupancy Certificate is absent — the most common defect in Bengaluru apartment paperwork — and the owner's name is written inconsistently across the deed, the khata and the tax roll. |
| **RV-000002** | Agricultural land · Chikkajala, Devanahalli | Professional review | 80% (4/5) | 3 critical, 4 attention, 2 info | A genuinely problematic parcel. The survey number disagrees with itself, the extent differs by 5%, and a 2020 mortgage has no traced release. |
| **RV-000003** | Residential site · Sarjapur | Documentation assembled | 100% (5/5) | 1 info | What *nothing to action* looks like. Every required document present, every extraction signed off, nil-encumbrance certificate on file. |

### A ten-minute tour

**1 · Enter as the property owner.** The dashboard shows all three properties with their readiness band, completeness against the checklist for that property type, and the cumulative processing cost.

**2 · Open RV-000002 → Findings.** Read the survey number mismatch. Expand it, then click any piece of page evidence — you land in the document viewer on that exact page with the matched passage highlighted. Every finding in the system works this way; none of them assert anything you cannot trace to a page.

**3 · RV-000002 → Timeline.** The 2008 partition, the 2013 sale, the 2020 mortgage and the land revenue payment on one axis. Note that the partition deed is annotated *deed not uploaded*: it is known only from the entry table inside the Encumbrance Certificate, which the platform parsed out of the certificate's text.

**4 · RV-000002 → Graph.** Click any node. It lists which documents assert that the node exists. Two people, one lender, one parcel identifier, one village.

**5 · RV-000001 → Graph.** Look at the person nodes. `Vinay Kumar S.` and `S. VINAY KUMAR` have collapsed into one node. `VINAY KUMAR` from the tax roll has not — it is close but not equivalent, so it stays separate and raises a name variant finding instead of being silently merged.

**6 · RV-000001 → Documents → Upload.** Four samples are offered. Each takes a deliberately different path through the pipeline:

| Sample | What happens | Why it is here |
|---|---|---|
| **Occupancy Certificate** | Clean run, all 13 stages | Watch the pipeline, then return to Findings: the missing-document finding is gone and completeness reaches 100% |
| **EC (re-upload)** | Halts at stage 2 of 13, cost ₹0.00 | Content-hash dedupe runs *before* OCR, so a duplicate costs nothing |
| **Partition deed (poor scan)** | OCR confidence drops to 0.71, fields route to review | A weak photocopy should not be trusted into the record. Upload this one to **RV-000002** and its chain-of-title reference resolves |
| **HDFC loan sanction** | OCR times out, then retries itself | Only that stage re-runs. The four stages before it are not redone |

**7 · Review tab.** Approve a field, or correct one. A correction is stored *beside* the machine value rather than on top of it, and the panel shows you both. This is what lets a reviewer's correction survive a reprocess when the extraction prompt is later improved.

**8 · Assistant tab.** Ask *"are there any unreleased charges?"* — every answer carries page citations and names the query tools it used. Then ask the last suggested question, *"Is the title clear and safe to buy?"*, and watch it decline and redirect you to what it can actually tell you.

**9 · Sharing tab.** Issue a link scoped to summary and checklist only. Open it in a new tab — note that the document text and timeline sections are absent, because they are not in scope. Then revoke the link and reload: access is withdrawn immediately, without waiting for expiry.

**10 · Exit and re-enter as the buyer.** Same properties, same findings, all editing capability removed.

---

## 6. Feature reference

### Global

| Screen | Purpose |
|---|---|
| **Landing / role picker** | Three roles with different capabilities, plus an explicit statement of what is simulated |
| **Dashboard** | Portfolio-wide statistics, per-property readiness, recent activity, cost per property |
| **Properties** | List and creation. A property profile comes first; documents attach to it |
| **Search** | Full-text search across page content *and* extracted fields, with identifier normalisation applied |
| **Audit trail** | Every state change with actor, target, timestamp and filter by action type |
| **Share view** | Public, tokenised, scope-limited read-only view at `/share/<token>` |

### The property workspace

Eight tabs, each answering a different question.

| Tab | Question it answers |
|---|---|
| **Overview** | What state is this file in, and what needs doing? Includes *reconciled facts* — whether the documents **agree**, not what one of them says |
| **Documents** | What do we hold? Page text with evidence highlighting, the extraction with confidence bars, and the live pipeline for each document |
| **Review** | What has a human verified? Filter by pending, below-threshold, or all. Approve, correct, reopen |
| **Timeline** | What happened to this property, in order? Registered transfers, EC entries, encumbrances, municipal events, tax payments |
| **Graph** | How are the entities related, and which document says so? Interactive node inspection with source attribution |
| **Findings** | What is wrong, and who resolves it? The full due-diligence report with the versioned checklist |
| **Assistant** | Ask a question in plain language, get an answer with page citations or an explicit refusal |
| **Sharing** | Who has access, to what, and until when? Scoped capability links with revocation and view logging |

---

## 7. The synthetic document corpus

**Every document in this repository is synthetic.** Names, PANs, Aadhaar numbers, khata numbers, PIDs, registration numbers and transaction references are invented. Nothing here relates to a real person or a real property.

What *is* faithful is the **structure and field vocabulary** of real Karnataka instruments. Fifteen documents are seeded across the three properties, plus four uploadable samples.

| Document | Fields modelled |
|---|---|
| **Sale Deed** | Party identity with age and *S/o* or *W/o*, PAN, consideration with payment reference, schedule with survey number and four boundaries, registration particulars — document number, book, date, SRO, market value, stamp duty, registration fee — plus the recited parent document and witnesses |
| **Mother Deed** | Same structure, an earlier link in the chain, including the derivation the developer relied on |
| **Encumbrance Certificate** | Issued as **Form 15** when registered encumbrances exist for the searched period, and **Form 16** when the search returns nil. Numbered entry table with nature of deed, document number, registration date, executant, claimant, consideration or amount secured, and volume/page |
| **Khata / e-Khata** | The khata number, PID and SAS base application number triple, khata classification (**A-Khata** vs **B-Khata**), ward and zone, built-up area, usage, annual rateable value, transfer reference |
| **RTC (Pahani)** | District, taluk, hobli, village, survey and hissa number, extent in acres–guntas, kharab, cultivable extent, land classification, soil type, season-wise crop entries, mutation register reference, charges noted in the revenue record |
| **BBMP Tax Receipt** | SAS application number, PID, assessment year, tax and cess computation, rebate, net amount, transaction ID, payment reference, receipt number |
| **Occupancy Certificate** | Certificate number, issue date, land reference, plan sanction reference, units and floors certified, deviations noted |
| **Sanctioned Plan** | Sanction number and date, plot area, sanctioned floors and units, permissible FAR |
| **Conversion Order** | Section 95 order number and date, extent converted, purpose, conversion fine, conditions |
| **Loan Sanction** | Lender, reference, amount, rate, tenure, security offered, conditions precedent |

### Sources consulted

Field sets were modelled against official portals and published field breakdowns:

- [Kaveri Online Services](https://kaverionline.karnataka.gov.in/) — Karnataka Department of Stamps and Registration
- [BBMP Property Tax System](https://bbmptax.karnataka.gov.in/) — SAS and PID structure
- [BBMP e-Aasthi](https://www.bbmpeaasthi.karnataka.gov.in/CitzLogin.aspx) — e-Khata records
- [Encumbrance Certificate: Form 15 vs Form 16](https://cleartax.in/s/encumbrance-certificate-karnataka)
- [RTC / Pahani field breakdown](https://web.landeed.com/karnataka/rtc-search-by-name)
- [Bhoomi land records overview](https://www.bajajfinserv.in/bhoomi-rtc-mutation-status)

*Content from these sources was rephrased for compliance with licensing restrictions.*

---

## 8. What is real and what is simulated

Being precise about this matters, because the value of the demo is the architecture, not the illusion.

### Real

- The **13-stage pipeline**: ordering, per-stage retry, attempt counting, halt semantics and resume-from-stage after interruption
- **Identifier normalisation** — survey numbers, person names, registration numbers, and extent conversion across acres, guntas, square feet and square metres
- **Entity resolution with certainty bands.** Nothing auto-merges below 0.97 similarity; the band between 0.82 and 0.97 becomes a review queue, not a decision
- **Cross-document consistency checks** producing every finding you see
- **Versioned rule-based compliance evaluation**, with the rule-set version snapshotted onto each report
- **Graph construction** with per-node and per-edge source-document attribution
- The **evidence-or-refuse contract**: an answer with zero citations is converted into a refusal by a validator, not discouraged by a prompt
- **Human-correction persistence semantics** — machine value and human value stored side by side
- **Per-document cost accounting** in pages, tokens and rupees
- **Scoped share capabilities** with expiry, revocation and view logging
- The **audit trail**

### Simulated

| Component | Reality in the demo | What replaces it in production |
|---|---|---|
| **OCR** | Page text is authored | Azure Document Intelligence behind the same interface |
| **Extraction** | Fields pre-authored per sample | LLM with a typed output schema per document type |
| **Answer prose** | Assembled from templates over real evidence bundles | The same bundle sent to an LLM; tool selection and refusal logic unchanged |
| **Storage, auth, database** | Browser memory + `localStorage` | Supabase Postgres, Auth and Storage |
| **Malware scan** | Stage exists, always returns clean | A real scanner wired to the existing stage |
| **Stage timings** | Representative constants | Measured durations |

---

## 9. Architecture

### Layering

```
app/                       Next.js App Router — routes and layouts only
│
src/domain/                Pure domain logic. No React, no Next.js imports
│   types.ts               Domain model. Structurally cannot express legal clearance
│   clock.ts               Fixed demo clock, Indian date parsing, assessment years
│   normalize.ts           Deterministic normalisation, similarity, match bands
│   fields.ts              Field resolution — human correction always wins
│   document-types.ts      v1 document taxonomy (11 types)
│   rules.ts               Versioned compliance checklists, stored as data
│   consistency.ts         Cross-document checks → findings
│   compliance.ts          Rule evaluation, completeness, readiness banding
│   timeline.ts            Timeline assembly + Encumbrance Certificate entry parser
│   graph.ts               Graph construction and deterministic radial layout
│   assistant.ts           Intent → planner → tools → evidence → answer
│
src/sim/pipeline.ts        Stage specifications, run planning, cost estimation
src/demo/                  Synthetic corpus, upload payloads, seed state
src/store/                 Reducer, persistence, pipeline runner
src/components/            UI primitives and the eight workspace tabs
```

**`src/domain/` has no framework imports.** It is portable to a server, a background worker or a test harness without modification. That boundary is the entire point: when this stops being a browser simulation, the domain layer relocates and everything above it is replaced.

### Runtime shape of the demo

```
                    React reducer  (single source of truth)
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Pipeline runner   Domain engines    localStorage
   (setTimeout       (pure functions,  (persistence,
    scheduler,        recomputed on     resume-after-
    per-stage         every read)       reload)
    retry)
```

Derived state — compliance reports, timelines, graphs — is **never stored**. It is recomputed from documents on every read. Approving a single field immediately changes the completeness percentage, the findings list, the graph and the assistant's answers, because none of them are caches that could fall out of sync.

---

## 10. The ingestion pipeline

```
intake → dedupe → virus_scan → store_original → ocr → layout → classify
       → extract_entities → extract_relationships → canonical_map
       → graph_update → compliance_eval → index
```

| # | Stage | Workload | Purpose |
|---|---|---|---|
| 1 | `intake` | deterministic | Validate MIME against the allowlist, enforce the size cap, compute the SHA-256 content hash |
| 2 | `dedupe` | deterministic | Compare the hash against documents already on the property. Runs before OCR so a duplicate costs nothing |
| 3 | `virus_scan` | deterministic | Scan the bytes before anything is allowed to read them |
| 4 | `store_original` | deterministic | Write the immutable original and open a document version. Originals are never mutated |
| 5 | `ocr` | OCR provider | Convert pages to text with per-word confidence. The dominant cost |
| 6 | `layout` | OCR provider | Detect tables, key-value regions and reading order |
| 7 | `classify` | model | Assign a document type with a confidence score. Below threshold it stays unclassified rather than guessing |
| 8 | `extract_entities` | model | Pull the field set for the classified type, each field with a page reference and confidence |
| 9 | `extract_relationships` | model | Read links between entities — who transferred to whom, which parent document is relied on, which office registered it |
| 10 | `canonical_map` | deterministic | Normalise identifiers and resolve entities. Nothing merges below the certainty threshold |
| 11 | `graph_update` | deterministic | Write nodes and edges, each tagged with the documents that assert it |
| 12 | `compliance_eval` | deterministic | Re-run the versioned checklist and the consistency checks |
| 13 | `index` | deterministic | Update full-text and vector indexes |

### Two deliberate decisions

**Duplicate detection runs second, before OCR.** A linear reading of a pipeline sketch tends to place it after extraction, alongside the other comparison work. That means paying for OCR and LLM tokens on a file you already hold. Exact-hash dedupe is cheap and belongs at the front. Near-duplicate detection — OCR text similarity, vector search — genuinely does require the text and correctly stays late.

**Every stage is independently retryable** and records its own attempt count. An OCR provider timeout on page forty retries that stage only; it does not restart the document and discard the four stages that already succeeded. This is the entire reason the pipeline is modelled as discrete stages rather than one long function. A run interrupted by a page reload is restored as *failed at the stage it was on*, and can be resumed from exactly there.

---

## 11. The intelligence engines

### Normalisation

Run before any comparison. Deterministic, reproducible, no model involved.

| Input | Normalised | Note |
|---|---|---|
| `Sy. No. 42/3A` | `42/3A` | Prefix and spacing stripped |
| `42-3` | `42/3` | Hyphen and en-dash unified to slash |
| `Survey No 118 / 2` | `118/2` | |
| `Vinay Kumar S` | `KUMAR\|VINAY::S` | Words sorted, initials separated |
| `S. Vinay Kumar` | `KUMAR\|VINAY::S` | **Equal** — leading and trailing initials are the same fact |
| `Sri Vinay Kumar` | `KUMAR\|VINAY::` | **Not equal** — a dropped initial is a real difference |
| `LAKSHMAMMA W/O NARAYANASWAMY` | `LAKSHMAMMA::` | Relationship clause is not part of the name |
| `2 Acres 20 Guntas` | `108,900 sq ft` | |
| `2 Acres 15 Guntas` | `103,455 sq ft` | 5% apart from the above, which is what triggers the finding |

**Match bands:** `≥ 0.97` same · `0.82 – 0.97` human review · `< 0.82` different. Nothing merges automatically in the middle band.

### Findings catalogue

Ten finding codes. Each carries a severity and an **owner** — who is expected to resolve it.

| Code | Severity | Owner | Triggered when |
|---|---|---|---|
| `SURVEY_NUMBER_MISMATCH` | critical | professional | More than one distinct parcel identifier survives normalisation |
| `EXTENT_MISMATCH` | critical / attention | professional | Extents diverge more than 2% once converted to a common unit; critical above 5% |
| `ENCUMBRANCE_RECORDED` | critical / attention | professional | An EC reports a charge with no traced release (critical), or the revenue record notes a charge (attention) |
| `OWNERSHIP_CHAIN_GAP` | critical / info | professional / reviewer | A recited parent document is not held. Critical if no EC evidences it; informational if an EC entry does |
| `MISSING_DOCUMENT` | attention | reviewer | A required checklist item has no document of that type |
| `NAME_VARIANT` | attention | reviewer | Two owner-name keys fall in the review band — close enough to be one person, not close enough to merge |
| `STALE_DOCUMENT` | attention | reviewer | The newest tax receipt is two or more assessment years behind |
| `LOW_CONFIDENCE_EXTRACTION` | attention | reviewer | Any unreviewed field is below 0.85 confidence |
| `DUPLICATE_UPLOAD` | info | platform | Content hashing blocked one or more uploads |
| `UNREVIEWED_FIELDS` | info | reviewer | Extracted fields exist that no human has signed off |

### Compliance checklists

Stored as **versioned data**, not code. Current version `2026.02`.

| Property type | Rules | Required | Required items |
|---|---|---|---|
| Apartment | 8 | 6 | Sale Deed, Mother Deed, EC, Khata, Tax Receipt, Occupancy Certificate |
| Residential site / plot | 6 | 5 | Sale Deed, EC, Khata, Conversion Order, Tax Receipt |
| Agricultural land | 6 | 5 | Sale Deed, Mother Deed, RTC, EC, Land Revenue Receipt |
| Commercial | 6 | 6 | Sale Deed, EC, Khata, Occupancy Certificate, Sanctioned Plan, Tax Receipt |

Every rule carries a **rationale** shown in the report, so the checklist explains itself rather than reading as an arbitrary list.

### Readiness bands

| Band | Condition | Label shown |
|---|---|---|
| `blocked` | Any critical finding | Professional review required |
| `review` | Any attention finding, or completeness below 100% | Reviewer action pending |
| `assembled` | Neither | Documentation assembled |

Deliberately **not** called a trust score. The label describes the state of the paperwork, and the description on screen says so explicitly.

### Timeline

Assembled from two sources: registered instruments held in the vault, and the **entry table parsed out of Encumbrance Certificates**. An EC is the single richest source of transaction history in an Indian property file, and its entries are the backbone of the ownership chain even when the underlying deeds were never uploaded. Where the vault holds the deed itself, the EC line is suppressed to avoid showing the same transfer twice.

### Graph

Nodes across eight kinds — property, person, document, survey number, khata, registry office, lender, village. Edges across eight relationship types — `OWNS`, `SOLD_TO`, `HAS_DOCUMENT`, `REFERENCES`, `REGISTERED_AT`, `LOCATED_IN`, `HAS_KHATA`, `HAS_LOAN`.

Every node and every edge carries the document IDs that assert it. An edge with no supporting document is never created, which keeps the graph auditable: you can always ask *which page says this?*

---

## 12. The reasoning layer

```
question → intent detection → planner → allowlisted read-only tools
         → evidence builder → answer with citations
```

The reasoning layer has **no database access**. It can call only these seven read-only query tools, each returning already-validated structured data:

```
property.get      documents.list    documents.searchText    fields.collect
ownership.chain   compliance.report findings.list
```

There is no free-form query path, so there is no route by which the layer can assert a fact that no document supports.

Twelve intents are routed, including a full-text fallback. Two guarantees are structural rather than instructional:

1. **An answer with an empty citation list is converted into a refusal** by the `finalise` function. It cannot escape.
2. **Questions asking for a legal conclusion are detected before any handler runs** and are declined with a redirect to what the platform can actually say.

Source precedence matters in the answers. `owner_name` comes from the municipal or revenue record and `latest_owner` from the most recent EC claimant — both describe the present holder. `purchaser_name` appears on every deed in the chain, so treating it as an owner field would list a seller's grandfather as a current owner. It is used only when nothing better exists, and then only from the most recently registered deed, with the weaker provenance stated in the answer.

---

## 13. Legal safety by construction

The commercial case depends on being trusted, and the fastest way to destroy that is to let the system say something it cannot support. So the constraint is built into the type system rather than into prompt text.

- **No domain type can represent** "title is clear", "safe to buy", or any equivalent. There is no field to set and no enum member to select.
- **Findings are worded as observations** and each carries an `owner` field naming who resolves it: `platform`, `reviewer` or `professional`.
- **The readiness band is a description of paperwork**, never a verdict on title.
- **A legal-conclusion question is refused before routing**, and the refusal explains what the platform *can* tell you — completeness, findings by severity, and the option to share the workspace with a lawyer.
- **The disclaimer appears on every screen** that presents findings, and is defined once as `LEGAL_DISCLAIMER` so it cannot drift between pages.

---

## 14. Design decisions and their rationale

### Compliance rules are versioned data, not code

If a checklist were a hardcoded array and you edited it, every historical report would silently change meaning. Rules are rows with a version string, and each report snapshots the version it was evaluated against. Reproducibility is what makes a due-diligence artefact defensible; without it, a report is only an opinion about the moment it was viewed.

### Human corrections sit beside machine values, never on top

An `ExtractedField` holds `aiValue`, `aiConfidence`, `humanValue`, `reviewedBy`, `reviewedAt` and `status`. All reads resolve `humanValue ?? aiValue` through a single function in `fields.ts`.

This is not defensive over-engineering. Without it, improving the extraction prompt and reprocessing a document would wipe out every correction a lawyer ever made — and because the machine value would already have been overwritten, there would be no way to recover them. It is also a migration you cannot perform retroactively across data you never recorded.

### Nothing auto-merges below high certainty

`Vinay Kumar S.` and `S. VINAY KUMAR` produce an identical name key and collapse into one graph node. `VINAY KUMAR` from the tax roll does not — dropping an initial is a real difference — so it remains a separate node and raises a name variant finding. **Silently merging two people is a worse failure than asking a human to confirm.**

### Chain-of-title references are graded by corroboration

A recited parent document that is neither uploaded nor recorded in any EC is **critical**: the chain cannot be followed at all. A parent document that is not uploaded but *does* appear in an EC entry is **informational**: the registry index evidences its existence, executant and claimant, though the deed's own recitals and schedule remain unread.

Collapsing these into one severity was the first implementation, and it was wrong — it flagged a well-documented file as critically defective purely because a twenty-year-old deed had never been scanned. Whether the physical deed is also required is a checklist question, and `MISSING_DOCUMENT` answers it independently.

### Cost is tracked from the first upload

A fifty-document property at thirty pages each is fifteen hundred pages of OCR plus extraction tokens. Pricing a verification package without that number is guesswork. Cost visibility cannot be retrofitted onto data you never recorded, so `pagesProcessed`, `llmTokensIn`, `llmTokensOut`, `model` and `promptVersion` are on every document from the moment it is created.

### Derived state is computed, never cached

Compliance reports, timelines and graphs are recomputed from documents on every read. Approving one field instantly and correctly updates the completeness percentage, the findings, the graph and the assistant. There is no invalidation logic to get wrong, and no possibility of a stale report being shared with a lender.

---

## 15. Data model

Core entities in `src/domain/types.ts`.

| Type | Role |
|---|---|
| `Property` | The record everything attaches to. Reference, kind, address, `ParcelIdentity` |
| `ParcelIdentity` | Survey number, hissa, khata, PID, SAS number, village, hobli, taluk — because each authority addresses the same parcel differently |
| `VaultDocument` | File identity, SHA-256, version, classified type with confidence, pages, fields, status, pipeline stages, usage |
| `ExtractedField` | `aiValue` + `aiConfidence` + optional `humanValue` + review metadata + page evidence |
| `PipelineStageState` | Status, attempt count, timing, detail, error, and whether the stage is deterministic |
| `DocumentUsage` | Pages, OCR cost, tokens in and out, LLM cost, model, prompt version |
| `Finding` | Code, severity, title, neutral detail, page evidence, resolution owner |
| `ComplianceRuleSet` | Versioned checklist, keyed to property kind |
| `ComplianceReport` | Items, counts, completeness, findings, and the **snapshotted rule-set version** |
| `TimelineEvent` | Date, kind, title, detail, optional source document |
| `GraphNode` / `GraphEdge` | Kind, label, and the **source document IDs that assert it** |
| `ShareLink` | Token, audience, scopes, creation, expiry, revocation, view log |
| `AuditEvent` | Actor, action, target, timestamp, metadata |
| `AssistantAnswer` | Answer, **required non-empty citations**, confidence, tools used |

Statuses: documents move through `queued → processing → ready | needs_review | duplicate | failed`. Fields move through `unreviewed → approved | corrected`.

---

## 16. Cost model

| Component | Rate |
|---|---|
| OCR | ₹1.30 per page |
| LLM input | ₹0.22 per 1,000 tokens |
| LLM output | ₹1.10 per 1,000 tokens |
| Token estimate | ~1,100 input tokens per page plus 1,800 fixed; ~240 output tokens per page plus 400 |

Worked examples for a three-page document:

| Outcome | Pages billed | Cost | Note |
|---|---|---|---|
| Clean run | 3 | ₹6.25 | |
| Routed to review | 3 | ₹6.25 | Low confidence costs the same to produce |
| **Duplicate** | **0** | **₹0.00** | Halted at stage 2, before OCR |
| Transient OCR failure | 3 (OCR twice) | ₹10.15 | Retry is not free, and the number reflects it |

The dashboard aggregates this per property and across the portfolio.

---

## 17. Roles and permissions

| Capability | Owner | Lawyer | Buyer |
|---|---|---|---|
| View properties, findings, timeline, graph | ✅ | ✅ | ✅ |
| Ask the assistant | ✅ | ✅ | ✅ |
| Create properties | ✅ | ✅ | ❌ |
| Upload documents | ✅ | ✅ | ❌ |
| Retry a pipeline stage | ✅ | ✅ | ❌ |
| Approve or correct extractions | ✅ | ✅ | ❌ |
| Issue and revoke share links | ✅ | ✅ | ❌ |

Share links carry five independent scopes: `summary:read`, `compliance:read`, `documents:read`, `timeline:read`, `graph:read`. A lender assessing completeness does not need the full text of every deed, and the scope model reflects that.

---

## 18. Project structure

```
doc_vault/
├── app/
│   ├── layout.tsx                    Root layout, provider mount
│   ├── globals.css                   Tailwind theme tokens, animations
│   ├── page.tsx                      Landing and role picker
│   ├── (app)/
│   │   ├── layout.tsx                Authenticated shell, sidebar, session gate
│   │   ├── dashboard/page.tsx
│   │   ├── properties/page.tsx       List and creation
│   │   ├── properties/[id]/page.tsx  Workspace, eight tabs
│   │   ├── search/page.tsx
│   │   └── audit/page.tsx
│   └── share/[token]/page.tsx        Public scoped view
├── src/
│   ├── domain/                       11 modules, zero framework imports
│   ├── sim/pipeline.ts               Stage specs, planning, costing
│   ├── demo/                         seed-documents · upload-payloads · seed
│   ├── store/vault-store.tsx         Reducer, persistence, pipeline runner
│   └── components/
│       ├── ui.tsx                    Primitives
│       ├── page-header.tsx
│       ├── finding-card.tsx          Expandable finding with clickable evidence
│       ├── pipeline-view.tsx         Live 13-stage view with retry
│       └── tabs/                     Eight workspace tabs
├── plan.md                           Original architecture plan
└── README.md
```

---

## 19. Development

```bash
npm run dev         # development server
npm run build       # production build — fails on any type or lint error
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

### Standards

TypeScript runs with `strict`, plus `noUncheckedIndexedAccess`, `noUnusedLocals` and `noUnusedParameters`. `next.config.ts` explicitly refuses to let builds ignore type errors:

```ts
typescript: { ignoreBuildErrors: false }
```

There are no `any` types in the codebase. Accessibility basics are respected — semantic elements, ARIA labels on graphical elements, visible focus rings, and `prefers-reduced-motion` honoured for the animation-heavy pipeline view.

### Conventions

- Domain logic never imports React or Next.js
- Extracted values are read only through `effectiveValue()`, never `field.aiValue` directly
- New findings must carry page evidence and a resolution owner
- New compliance rules require a **version bump**, never an in-place edit
- Comments explain *why*, particularly where a simpler implementation was rejected

---

## 20. Verification

Verified at the current commit:

| Check | Result |
|---|---|
| `npm run typecheck` | Clean under `strict` + `noUncheckedIndexedAccess` |
| `npm run lint` | Clean |
| `npm run build` | Succeeds, 8 routes |
| Runtime | All 11 routes return 200 against the production server |

Domain behaviour was verified by driving the engines through a temporary diagnostic route, since the authenticated shell does not render server-side. Confirmed:

- Normalisers produce the exact keys documented in [§11](#11-the-intelligence-engines), including the deliberate non-equality of `Vinay Kumar S` and `Sri Vinay Kumar`
- All three properties produce their intended findings, severities and readiness bands
- Timelines contain no duplicate events between vault deeds and EC entries
- The graph resolves people correctly and does not treat a release-of-mortgage as creating a charge
- The assistant cites evidence on every answer and refuses both legal-conclusion questions and unanswerable ones
- Pipeline plans are correct for all four outcomes, including the duplicate halting at stage 2 for ₹0.00

The diagnostic route was removed afterwards.

### Bugs found and fixed during verification

Recorded because they are the kind of error that survives a code review and only surfaces when you run the data through:

1. A **release of mortgage** matched the lender detector on the word "mortgage", so the property owners appeared in the graph as banks
2. Findings were not **severity-sorted** after merging the missing-document and consistency producers, so a report could open with an attention item above a critical one
3. The timeline **double-counted** every deed held in the vault against its own EC entry
4. *"Walk me through the chain of ownership"* routed to the **owner** handler because it matched `ownership` first
5. The owner answer listed **historical purchasers as current owners**
6. `NAME_VARIANT` was implemented but **unreachable** with the original corpus, since every name resolved to one key

---

## 21. Production path

This demo is deliberately a single browser-resident application. The intended production shape:

| Concern | Choice | Reasoning |
|---|---|---|
| Application | Next.js App Router, domain logic isolated in `src/domain/` | Lifts into a separate service later without touching domain code |
| Database | Postgres via Supabase | Graph as node and edge tables with recursive CTEs; Neo4j only when traversal depth justifies the operational cost |
| Auth | Supabase Auth | `auth.uid()` works inside RLS and Storage policies without bridging identity from a third party |
| Storage | Supabase Storage, short-TTL signed URLs minted per request | Never public object URLs |
| Queue | pg-boss on the same Postgres, worker on a long-running host | Delivers per-stage retry without adding Redis. Serverless functions cannot hold a 13-stage run within their duration limit |
| OCR | Azure Document Intelligence | Layout detection is required, not optional — an EC entry table is worthless as flat text |
| Extraction | LLM with typed output schemas per document type | |
| Search | Postgres full-text, pgvector where similarity genuinely beats FTS | |
| Observability | Per-stage timing and cost already recorded; needs a sink | |

### Open decisions

Deliberately not settled by this demo, and not foreclosed by it either:

1. Supabase Auth versus a third-party identity provider
2. Prisma with application-layer authorisation, versus `supabase-js` with RLS enforcement
3. Where workers run — pg-boss on a managed host versus a durable execution service
4. OCR provider selection, contingent on Kannada-script requirements
5. Which document types beyond the current five extraction targets earn schema work in v1

---

## 22. Known gaps

Stated plainly, because they are the actual remaining work.

**1 · Real documents.** Extraction schemas and the classifier are educated guesses until 15–20 real anonymised Karnataka documents are in hand. A real Encumbrance Certificate has a structure you would not predict from a description of one. This is the highest-leverage item and it is not a coding task.

**2 · Kannada script and handwriting.** Many deeds are Kannada-script scans with handwritten annotations and registrar stamps struck across the text. This changes both provider selection and any honest accuracy expectation.

**3 · Entity resolution at scale.** The normalisers handle the cases they were built for. Transliteration variants, regional naming conventions and compound survey numbers need a far larger test corpus before the match bands can be trusted.

**4 · An evaluation harness.** Prompt version and model are already recorded per document. What is missing is a labelled golden set to measure classification and extraction accuracy against — the only way to know whether a prompt change helped or hurt.

**5 · Malware scanning.** The pipeline stage exists; no scanner is wired to it.

**6 · DPDP compliance.** Property files contain Aadhaar and PAN data. Data minimisation, purpose limitation, retention, deletion workflows and breach response need designing in rather than bolting on.

**7 · No automated tests.** Verification to date has been manual and route-driven. The domain layer is pure and has no framework dependencies, which makes it straightforwardly unit-testable — that work has simply not been done.

---

## 23. Roadmap

**v1 — the scope of this demo.** Property workspace, document vault, extraction with human review, completeness and consistency findings, timeline, property graph, scoped sharing, audit trail.

**v1.5.** Real OCR and extraction, evaluation harness, notifications and renewal reminders, team workspaces, automated test suite.

**v2.** Professional verification network, lawyer review workflow, government record integration where legally permitted.

**v3.** Enterprise API for lenders and developers, property passport, multi-state coverage.

Explicitly **out of scope**: marketplace, valuation engine, home loans, payments, blockchain, mobile application, automated legal opinions.

---

## 24. Glossary

Indian property terms used throughout, for readers outside the Karnataka context.

| Term | Meaning |
|---|---|
| **Sale Deed** | The registered instrument that transfers ownership from seller to buyer |
| **Mother Deed** | An earlier title document establishing how the current seller acquired the property |
| **Encumbrance Certificate (EC)** | A registry search report listing transactions recorded against a property for a stated period. **Form 15** when encumbrances are found, **Form 16** when the search returns nil |
| **Khata** | A municipal record identifying who is assessed for property tax. **A-Khata** denotes a fully compliant property; **B-Khata** indicates an irregularity |
| **e-Khata / e-Aasthi** | The digitised khata record, mandatory for registration within BBMP limits |
| **PID** | Property Identification Number, assigned by BBMP |
| **SAS** | Self Assessment Scheme, BBMP's property tax mechanism; the base application number keys a property in it |
| **RTC / Pahani** | Record of Rights, Tenancy and Crops — the revenue record for agricultural land |
| **Survey number** | The parcel identifier in revenue records; **hissa** denotes a subdivision |
| **Kharab** | Land within a holding that is unfit for cultivation and excluded from the assessable extent |
| **Gunta** | A unit of area. 40 guntas make one acre; one gunta is 1,089 sq ft |
| **Mutation** | The revenue-record update that reflects a change of ownership |
| **Conversion Order** | A Section 95 permission converting agricultural land to non-agricultural use |
| **Occupancy Certificate (OC)** | Certifies a completed building is fit for occupation as sanctioned |
| **SRO** | Sub-Registrar Office, where instruments are registered |
| **BBMP** | Bruhat Bengaluru Mahanagara Palike, the Bengaluru municipal corporation |
| **Bhoomi** | Karnataka's online land records portal |
| **Kaveri** | Karnataka's registration and stamps portal |
| **DPDP Act** | Digital Personal Data Protection Act, 2023 — India's data protection statute |

---

## 25. Project status

**Pre-MVP.** Nothing in this repository has been validated with real users or real documents. The architecture is intended to be sound and the domain logic is intended to be correct, but both are untested against reality.

The demo exists to make the architecture legible and to be argued with.

**Licence** to be determined before public release.

<div align="center">

Built to make property ownership in India legible, one document at a time.

</div>
