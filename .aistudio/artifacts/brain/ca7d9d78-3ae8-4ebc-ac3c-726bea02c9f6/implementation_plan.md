# Diamond Business Suite — Master Implementation Plan

A modular, multi-company business management suite designed for commercial deployment, enabling businesses to manage customers, sales pipelines, operations, orders, and decimal-accurate invoicing under strict tenant data isolation.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been established based on your requirements and confirmed preferences:

* **Primary Demonstration Profile**: Professional Services and Digital Agencies (demonstrating billable engagements, creative services, retainer contracts, and client projects).
* **Default Currency & Formatting**: US Dollar (`USD`, `$`), formatted with explicit decimal precision to eliminate floating-point rounding errors.
* **Visual Direction**: Executive Navy (`#0B192C`) and Slate Blue (`#1E3E62`) with high-intent Cyan accents (`#00B4D8` / `#38BDF8`), neutral cool background fields (`#F8FAFC`), and tabular data alignment.
* **Multi-Tenancy Guardrail**: Server-authoritative workspace scoping. No cross-tenant data leakage is permitted; every read, write, filter, and export verifies the active workspace membership and role.

---

### 1. Overview & Core Concept

* **What It Does**: Diamond Business Suite is a unified operating system for service and agency businesses. It consolidates CRM (customer records and communication logs), sales pipeline tracking (kanban stages and expected deal values), work and task management (team assignments and deadlines), service orders/retainers, and customer invoicing with payment balance tracking into a single responsive interface.
* **Target Audience / Persona**: Small and medium-sized agencies, professional service firms, consultancies, and independent service companies seeking an organized, commercial-grade operational platform.
* **Key Commercial Value**: A single platform that Diamond can license to multiple independent client businesses, providing each company with a private, branded workspace while ensuring zero cross-tenant data leakage.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Workspace & Identity Onboarding**: The user accesses the suite, chooses or creates a business workspace (e.g., "Apex Digital Agency" vs. "Vanguard Strategy Group"), and switches roles (Owner, Manager, Employee, Viewer) to inspect permission gates.
2. **Customer CRM & Interaction Logging**: Search and filter client accounts, view customer dossiers, record follow-up dates and notes, and export authorized records to CSV.
3. **Sales Pipeline & Deal Flow**: Visualize deals moving across stages (Lead → Contacted → Proposal → Negotiation → Won/Lost) with weighted pipeline totals.
4. **Task & Team Execution**: Assign project milestones and operational tasks to team members with due dates, priorities, and status toggles.
5. **Orders & Invoicing Workflow**: Generate service orders, convert deliverables into multi-line invoices with automated tax and subtotal calculations, record payments, and print clean client-ready invoices.
6. **Executive Dashboard & Settings**: Monitor active client count, pipeline health, pending tasks, and revenue balances, with workspace customization (company profile, currency, team member management).

#### Visual Identity & Theme
* **Aesthetic Direction**: Executive, architectural, and restrained. Avoids generic admin-template clutter, flashy purple gradients, and decorative pseudo-technical widgets.
* **Color Palette & Distribution**:
  * *60% Neutral Canvas*: Crisp white (`#FFFFFF`) and structured light cool-slate (`#F8FAFC`).
  * *30% Structural Surfaces*: Deep Executive Navy sidebar (`#0B192C`), Slate Blue structural borders (`#E2E8F0` / `#CBD5E1`), and dark typography (`#0F172A`).
  * *10% Action Accent Budget*: Vivid Cyan (`#0284C7` / `#00B4D8`) for primary CTAs, active segmented tabs, and keyboard focus states.
  * *Semantic State Signaling*: Balanced Emerald (`#059669`) for Paid/Won, Amber (`#D97706`) for Pending/In-Review, and Rose (`#E11D48`) for Overdue/Lost.
* **Typography & Hierarchy**:
  * *Display & Navigation*: Plus Jakarta Sans for crisp, authoritative headings and section hierarchy.
  * *Body Prose*: DM Sans for effortless legibility across dense data tables and forms.
  * *Metrics & Financial Telemetry*: Tabular monospace figures (`tabular-nums font-mono`) ensuring strict decimal alignment for currency, dates, and invoice balances.
* **Component Styling & Layout Rules**:
  * *Workspace Canvas*: 260px persistent/collapsible sidebar + 3-Zone Header (Brand wordmark, contextual breadcrumb, user/role profile) + Main viewport.
  * *Zero-Pill Metadata Discipline*: Metadata (dates, counts, client types) rendered as clean unboxed text with typographic separators (`·` or `/`), reserving button styling strictly for clickable filter controls.
  * *Single-Elevation Depth*: Flat card surfaces with 1px hairline borders (`border border-slate-200`); no nested cards within cards.

---

### 3. Key Product Decisions & Trade-Offs

* **Decision 1: Tenant-Scoped Architecture from Day 1**
  * *Chosen Approach*: Associate every database entity (customers, leads, tasks, orders, invoices, payments, logs) with a required `workspace_id`. All data access queries mandate `where: workspace_id === active_workspace_id`.
  * *Why*: Protects against cross-company data leakage before commercial launch. Multi-tenant security cannot be retrofitted later without massive risk.
  * *Alternatives Considered*: Single-tenant databases per client (cost-prohibitive for initial SaaS/licensing model) or client-side filtering (unsafe and rejected).

* **Decision 2: Decimal-Safe Financial Architecture**
  * *Chosen Approach*: Store monetary values with 2-place fixed decimal precision and compute line items, taxes, subtotals, and outstanding balances using decimal-safe utility functions.
  * *Why*: Standard JavaScript floating-point arithmetic causes rounding discrepancies (e.g. `0.1 + 0.2 = 0.30000000000000004`), which is unacceptable in commercial invoicing.

* **Decision 3: Built-In Role Matrix (RBAC)**
  * *Chosen Approach*: Four clear roles: **Owner** (full settings, billing, deletion), **Manager** (create/edit all operational data, team assignment), **Employee** (create/edit assigned tasks and deals), **Viewer** (read-only access).
  * *Why*: Directly aligns with small and mid-sized business organizational structures while keeping permission checks straightforward and auditable.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Diamond Web Interface                            │
│  ┌───────────────────────┐ ┌──────────────────────────────────────────┐ │
│  │ 260px Navigation      │ │ Top Bar Contract (Wordmark · Role · User)│ │
│  │ - Workspace Selector  │ ├──────────────────────────────────────────┤ │
│  │ - Dashboard & Metrics │ │ Dynamic View Container                   │ │
│  │ - Customer Directory  │ │  - Executive Dashboard (Real Metrics)    │ │
│  │ - Sales Pipeline      │ │  - CRM Customer Master (CRUD & CSV)      │ │
│  │ - Task Manager        │ │  - Sales Pipeline (Kanban & Deal Stages) │ │
│  │ - Orders & Bookings   │ │  - Task Board (Priority & Due Dates)     │ │
│  │ - Invoices & Payments │ │  - Invoice Builder & Printable Invoice   │ │
│  │ - Workspace Settings  │ │  - Team & Security Roles (RBAC)          │ │
│  └───────────────────────┘ └──────────────────────────────────────────┘ │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    Tenant State & Security Layer                        │
│   - Active Workspace Resolution & Switcher                             │
│   - Authenticated User & Role Permissions Engine                        │
│   - Decimal-Safe Invoicing & Tax Math Utilities                         │
│   - Audit Trail Recorder (Timestamp, User, Action, Entity)              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                  Tenant-Scoped Persistence Repository                   │
│   - `workspaces` (id, name, slug, industry, currency, timezone)         │
│   - `workspace_members` (id, workspace_id, user_id, role, status)       │
│   - `customers` (id, workspace_id, name, company, email, phone, status) │
│   - `leads` (id, workspace_id, customer_id, title, stage, value)       │
│   - `tasks` (id, workspace_id, title, priority, status, due_date)       │
│   - `orders` (id, workspace_id, order_number, title, customer_id)      │
│   - `invoices` (id, workspace_id, invoice_number, items, tax, total)    │
│   - `payments` (id, workspace_id, invoice_id, amount, method, date)     │
│   - `audit_logs` (id, workspace_id, user_id, action, entity_id)         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Phased Implementation Roadmap
* **Phase 1 (Immediate Execution)**:
  * Application structure & Diamond design system (sidebar, top bar, responsive layout).
  * Multi-workspace engine with workspace switcher and demo companies.
  * Role switcher (Owner, Manager, Employee, Viewer) with live permission enforcement.
  * Automated unit tests for tenant isolation and decimal monetary calculations via `node:test`.
* **Phase 2**: Core Customer CRM (full CRUD, filtering, detail views, CSV export).
* **Phase 3**: Sales Pipeline & Task Management (stage transitions, deal summaries, task assignments).
* **Phase 4**: Orders, Invoicing & Payment Tracking (line item calculations, payment logging, printable invoices).
* **Phase 5**: Executive Dashboard & Workspace Settings (reconciled real metrics, team member invitations, audit log viewer).
