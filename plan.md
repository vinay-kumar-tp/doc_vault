System Architecture & Design Plan
Phase 0 – Domain Modeling (Most Important)

Goal: Understand the real-world domain before thinking about databases or APIs.

Core Domains
Identity & Authentication
Property Management
Document Management
Document Intelligence
Knowledge Graph
Compliance & Due Diligence
Search & Retrieval
AI Reasoning
Sharing & Collaboration
Audit & Activity

Each domain should own its own data and business rules.

Phase 1 – High-Level System Architecture
                Next.js (Frontend)
                       │
                REST API Gateway
                       │
      ┌────────────────┼────────────────┐
      │                │                │
      ▼                ▼                ▼
 Property Service  Document Service  AI Service
      │                │                │
      └────────────┬───┴────────────────┘
                   ▼
          PostgreSQL (Supabase)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    Supabase Storage    Search Layer
                   │
                   ▼
         Knowledge Graph Layer
                   │
                   ▼
          Compliance Engine
                   │
                   ▼
          Reasoning Orchestrator
                   │
                   ▼
             Claude / OpenAI

The LLM is not part of the data layer. It sits at the very top and consumes only verified information.

Phase 2 – Data Architecture

Before creating tables, define the core business entities.

Identity Domain
User
Organization
Team
Membership
Role
Permission
Property Domain
Property
Address
Parcel / Survey Number
Property Type
Ownership Record
Ownership History
Document Domain
Document
Document Version
Document Type
Upload Session
OCR Result
Extracted Text
Page
Attachment
Entity Domain

Every extracted fact becomes a structured entity.

Examples:

Person
Property
Survey Number
Registration Number
Khata Number
Village
Bank
Builder
Witness
Tax Receipt
Loan
Graph Domain

Graph Nodes

Person
Property
Document
Government Office
Loan
Bank

Graph Edges

OWNS
SOLD_TO
REFERENCES
REGISTERED_AT
HAS_DOCUMENT
LOCATED_IN
HAS_LOAN
HAS_KHATA

The graph should be stored in PostgreSQL initially using node and edge tables.

Compliance Domain

Tables should represent rules, not AI.

Examples:

Compliance Rule
Required Document
Rule Evaluation
Missing Document
Risk Finding

AI should never determine compliance.

Search Domain

Maintain searchable indexes.

Document Index
Property Index
Entity Index
AI Domain

Track every AI interaction.

Extraction Job
Prompt Version
Model Used
Confidence
Evidence
User Query
AI Response
Phase 3 – Ingestion Pipeline
Upload PDF
      │
Virus Scan
      │
Store Original
      │
OCR
      │
Layout Detection
      │
Document Classification
      │
Entity Extraction
      │
Relationship Extraction
      │
Duplicate Detection
      │
Canonical Mapping
      │
Knowledge Graph Update
      │
Compliance Evaluation
      │
Search Index Update
      │
Ready

Every stage is independent and retryable.

Phase 4 – Duplicate Detection

Never use an LLM.

Use deterministic methods:

SHA256 hash
File metadata
OCR text similarity
Registration number
Survey number
Owner matching
Issue date
pgvector similarity

Assign a confidence score.

Phase 5 – Canonical Data Layer

Every document maps into a single property schema.

For example:

Sale Deed → Buyer, Seller, Survey Number, Area, Registration Date

Khata → Owner, Property ID, Tax ID

Encumbrance Certificate → Transaction History

Different documents populate the same canonical entities.

Phase 6 – Knowledge Graph Construction

Every extracted entity becomes a node.

Relationships are created automatically.

Example:

Property A
│
├── Owned By → Vinay
├── Located In → Bengaluru
├── Registered At → Sub-Registrar Office
├── Supported By → Sale Deed
├── Has Khata → Khata Document
├── Has EC → Encumbrance Certificate

This graph becomes the source for reasoning.

Phase 7 – Compliance Engine

The compliance engine is rule-based.

Example:

Apartment Purchase Checklist

Sale Deed ✔
Khata ✔
Encumbrance Certificate ✔
Occupancy Certificate ✖
Latest Tax Receipt ✔

The engine returns structured results.

The LLM explains them.

Phase 8 – REST API Design

Design APIs by domain.

Property APIs
Create Property
Update Property
Delete Property
List Properties
Get Property Details
Property Timeline
Document APIs
Upload
Download
Preview
Delete
Reprocess
OCR Status
Entity APIs
List Entities
Merge Entities
Resolve Conflicts
Graph APIs
Property Graph
Relationship Explorer
Compliance APIs
Compliance Report
Missing Documents
Risk Summary
Search APIs
Global Search
Property Search
Document Search
AI APIs
Ask Question
Generate Summary
Explain Compliance

Every endpoint should return structured JSON.

Phase 9 – Reasoning Architecture

This is the critical piece.

User Question

↓

Intent Detection

↓

Planner

↓

Required REST APIs

↓

Fetch Structured Data

↓

Evidence Builder

↓

Prompt Assembly

↓

LLM

↓

Evidence-backed Answer

The LLM never accesses the database directly.

Phase 10 – UI Architecture

The UI should not be chat-first.

Main Modules
Dashboard
Property Workspace
Document Explorer
Timeline
Knowledge Graph Viewer
Compliance Report
AI Assistant
Search
Sharing
Settings

The AI assistant is just one module.

Phase 11 – User Journey
Login

↓

Dashboard

↓

Create Property

↓

Upload Documents

↓

Processing Status

↓

Review Extracted Information

↓

Approve / Correct

↓

Property Dashboard

↓

Compliance Report

↓

Ask Questions

↓

Share Property
Phase 12 – AI Response Design

Every response should contain:

Answer – natural language.
Evidence – document, page, extracted fields.
Confidence – extraction confidence.
Compliance Impact – if applicable.
Related Documents – links to supporting files.

Example:

Owner: Vinay Kumar

Evidence:
• Sale Deed.pdf (Page 2)
• Khata.pdf (Page 1)

Confidence:
99.4%

Compliance:
Ownership verified across two documents.

Related Documents:
- Sale Deed
- Khata

No answer should ever appear without supporting evidence.