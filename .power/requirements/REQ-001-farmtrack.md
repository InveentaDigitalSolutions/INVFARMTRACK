REQUIREMENTS PACKAGE: FarmTrack -- Digital Farm Tracking
PREPARED BY: Romeo
VERSION: v0.2
STATUS: draft (7 of 15 open questions resolved)

---

## 1. CONTEXT

- **Client / stakeholder:** Broton Verde -- The Green Heritage Company (developed by AGRIGENTUM S.A.). Primary contact: Santiago (Inveenta Digital Solutions).
- **Business problem:** Broton Verde operates an ornamental plant nursery and currently lacks a unified digital system to track the full lifecycle from planting through harvest to customer delivery and invoicing. Operations data (plantings, treatments, irrigation, harvest) and commercial data (orders, packing, invoicing) are either tracked manually or in disconnected tools, leading to incomplete records, difficulty measuring performance, and inability to demonstrate compliance.
- **Current state:** An existing Dataverse solution ("Nursery Activity Tracker", publisher prefix `agr_`, 11 tables) exists in the Enterprise DEV environment as a reference prototype. It covers basic nursery tracking but does not include the commercial domain (orders, packing, invoicing) and lacks the improved data model hierarchy. This prototype is reference-only and will not be modified.
- **Target state:** A production-ready Power Apps Code App (React 19 + TypeScript + Vite) backed by Dataverse (18 tables, publisher prefix `inv_`, solution name `DigitalFarmTracking`) that provides end-to-end nursery management across two domains: (1) Operations -- planting, treatment, irrigation, harvest, task scheduling, and performance dashboards; (2) Commercial -- customer management, orders, packing lists, and weekly automated invoicing. The app must be fast, intuitive, and pleasant for daily high-volume data entry by nursery workers.

---

## 2. SCOPE

**IN SCOPE:**
- Infrastructure management (shadehouses, batches, beds)
- Plant catalog with variety and patent tracking
- Season and planting lifecycle management
- Treatment and input tracking (fumigation, pest control, fertilizers)
- Irrigation logging
- Harvest tracking with quality and yield metrics
- Task scheduling and assignment via calendar
- Activity completion tracking
- Operations dashboards and reports
- Customer management (retail customers)
- Order management with line items
- Packing list creation and tracking (boxes, varieties, beds, packing method, packed-by)
- Weekly invoice generation from packing lists (automation target)
- Rotation tracking (plants moving between beds across seasons via new Planting records)
- Date dimension table (Calendar) for reporting

**OUT OF SCOPE:**
- Modification of the existing Enterprise DEV environment or `agr_` solution
- Financial accounting or general ledger integration
- Shipping / logistics beyond packing lists
- Supplier / procurement management
- Payroll or full HR management (only lightweight worker tracking via string fields)
- Mobile-native app (web-based responsive design only)
- Multi-language support (not confirmed; see Open Questions)
- Offline capability (not confirmed; see Open Questions)
- External system integrations (not confirmed; see Open Questions)

---

## 3. ACTORS & STAKEHOLDERS

| Actor | Role | System access | Decision authority |
|---|---|---|---|
| Nursery Manager | Oversees all operations and commercial activities; reviews dashboards and reports | Full access to all modules | Final decisions on requirements and priorities |
| Nursery Worker | Performs daily planting, treatment, irrigation, harvest, and packing tasks | Data entry for operations and packing; read access to schedules | None -- follows assigned tasks |
| Packing Worker | Inputs packing data (boxes, variety, bed, method) | Packing module data entry | None -- follows packing instructions |
| Commercial/Admin Staff | Manages customers, orders, invoices | Full access to commercial modules | Order and invoice approval |
| Santiago (Inveenta) | Project lead and developer | System administrator | Technical decisions, deployment |

> **Note:** Specific user roles, counts, and access levels have not been confirmed by the stakeholder. The actors above are inferred from the described workflows. See Open Questions.

---

## 4. FUNCTIONAL REQUIREMENTS

### Operations Domain

#### FR-01: Manage Shadehouses
User story: As a nursery manager, I want to register and maintain shadehouse records, so that I have an accurate inventory of physical growing structures.

Acceptance criteria:
- Given the Management section is open, when the user creates a new shadehouse with name, code, dimensions, and capacity, then the shadehouse record is saved to Dataverse with an Active status.
- Given an existing shadehouse, when the user updates its details (location, coordinates, capacity, dimensions), then the changes are persisted and reflected in all related views.
- Given an existing shadehouse, when the user deactivates it, then its IsActive flag is set to false and it no longer appears in default selection lists.

Priority: Must

---

#### FR-02: Manage Batches
User story: As a nursery manager, I want to create and manage batches within shadehouses tied to seasons, so that I can organize production by location and time period.

Acceptance criteria:
- Given a shadehouse exists, when the user creates a batch with a code, shadehouse reference, season reference, and position, then the batch is saved and appears under the selected shadehouse.
- Given a batch exists, when the user views it, then the batch displays its parent shadehouse, associated season, position, and any notes.

Priority: Must

---

#### FR-03: Manage Beds
User story: As a nursery manager, I want to register beds within batches with their physical characteristics, so that I know the exact growing conditions at each location.

Acceptance criteria:
- Given a batch exists, when the user creates a bed with name, type (Air/Ground), level (0-3), capacity, material, soil type, drainage, and irrigation type, then the bed is saved under the selected batch.
- Given a bed exists, when the user views the location hierarchy, then the full chain Shadehouse > Batch > Bed is visible.
- Given a bed exists, when the user deactivates it, then it no longer appears in planting assignment lists.

Priority: Must

---

#### FR-04: Manage Plant Catalog
User story: As a nursery manager, I want to maintain a plant catalog with species, varieties, patent information, and pricing, so that I have a single source of truth for all plant data.

Acceptance criteria:
- Given the Plant Catalog is open, when the user creates a plant record with name, code, latin name, species, variety, growth habit, propagation method, and default unit price, then the record is saved.
- Given a plant is patented, when the user sets IsPatented to true and fills patent number, holder, and expiry, then patent information is stored and trackable.
- Given a plant has a DefaultUnitPrice, when that plant is selected in a packing list item, then the price defaults from the plant record.

Priority: Must

---

#### FR-05: Manage Seasons
User story: As a nursery manager, I want to define growing seasons with start and end dates, so that I can group plantings and track performance by time period.

Acceptance criteria:
- Given the Season management view is open, when the user creates a season with name, start date, end date, and description, then the season is saved.
- Given a season exists, when the user marks it inactive, then no new plantings can be associated with it.

Priority: Must

---

#### FR-06: Log Planting Activities
User story: As a nursery worker, I want to log what was planted, when, and where, so that there is an accurate record of every planting event.

Acceptance criteria:
- Given a plant, bed, and season exist, when the user creates a planting with plant reference, bed reference, season reference, planting date, and quantity, then the planting record is saved with CurrentPlanting defaulting to true.
- Given a planting record exists, when the user views it, then the full traceability chain (Plant + Bed > Batch > Shadehouse + Season) is visible.
- Given an existing planting, when the user updates the quantity or notes, then the changes are persisted.

Priority: Must

---

#### FR-07: Track Plant Rotation
User story: As a nursery manager, I want to track when plants are moved between beds across seasons, so that I can maintain a complete history of plant locations.

Acceptance criteria:
- Given a plant is currently in Bed A (CurrentPlanting = true), when the user records a rotation to Bed B in a new season, then a new Planting record is created for Bed B with CurrentPlanting = true, and the previous Planting record's CurrentPlanting is set to false.
- Given multiple planting records exist for the same plant, when the user views the plant's history, then all planting records are listed chronologically with the current one clearly indicated.

Priority: Should

---

#### FR-08: Record Treatment Applications
User story: As a nursery worker, I want to record treatment applications (fumigation, pest control) against specific plantings, so that effectiveness can be measured and compliance requirements met.

Acceptance criteria:
- Given a planting and an input (chemical/product) exist, when the user logs a treatment with date, type (Insecticide/Fungicide/Herbicide/Regulator), worker name, and environmental conditions (temperature, humidity, pH), then the treatment record is saved and linked to the planting.
- Given a treatment is recorded, when a manager reviews it, then the full chain is visible: treatment > planting > bed > batch > shadehouse, plus the input product used.
- Given a treatment uses an input with a safety interval, when the treatment is recorded, then the safety interval days from the Input record are accessible for compliance review.

Priority: Must

---

#### FR-09: Manage Inputs Catalog
User story: As a nursery manager, I want to maintain a catalog of inputs (fertilizers, pesticides, chemicals) with composition, application methods, and safety data, so that treatments reference accurate product information.

Acceptance criteria:
- Given the Input catalog is open, when the user creates an input with name, category (Fertilizer/Pesticide/Fungicide/Herbicide/Growth Regulator/Other), application method, composition, safety interval days, and storage instructions, then the record is saved.
- Given an input exists, when it is selected during treatment recording, then its details (name, category, safety interval) are displayed for the worker.

Priority: Must

---

#### FR-10: Track Irrigation Events
User story: As a nursery worker, I want to log irrigation events with volume and method, so that water usage is documented per planting.

Acceptance criteria:
- Given a planting exists, when the user logs an irrigation event with date, amount in liters, and method (Drip/Sprinkler/Manual/Flood), then the irrigation record is saved and linked to the planting.
- Given multiple irrigation records exist for a planting, when the user views the planting detail, then total water usage and a history of irrigation events are visible.

Priority: Must

---

#### FR-11: Track Harvest
User story: As a nursery worker, I want to record harvest events with yield, quantity, and quality assessment, so that bed, shadehouse, batch, and season performance can be measured.

Acceptance criteria:
- Given a planting exists, when the user logs a harvest with date, yield in kg, quantity harvested, quality rating (Excellent/Good/Average/Poor), and worker name, then the harvest record is saved.
- Given harvest records exist, when a manager views performance by bed, batch, shadehouse, or season, then aggregated harvest data (total yield, total quantity, average quality) is available.

Priority: Must

---

#### FR-12: Schedule and Assign Tasks
User story: As a nursery manager, I want to create tasks with type, priority, due date, and worker assignment, so that daily work is planned and communicated clearly.

Acceptance criteria:
- Given the task management view is open, when the user creates a task with title, type (from 11 task types), priority (Low/Normal/High/Urgent), due date, and assigned worker, then the task is saved.
- Given a task can be linked to a planting or bed, when the user optionally selects a planting or bed reference, then the task is associated with that context.
- Given a task exists, when the assigned worker views the calendar, then the task appears on the correct date.

Priority: Must

---

#### FR-13: View Calendar of Activities
User story: As a nursery worker, I want to view a calendar showing my scheduled tasks and upcoming activities, so that I know what needs to be done each day.

Acceptance criteria:
- Given tasks exist with due dates, when the user opens the calendar view, then tasks are displayed on their respective dates with visual indicators for priority and status.
- Given the calendar is displayed, when the user selects a specific date, then all tasks for that date are listed with details (type, planting/bed context, assigned worker).
- Given the calendar is displayed, when the user filters by task type or assigned worker, then only matching tasks are shown.

Priority: Must

---

#### FR-14: Update Activity Completion Status
User story: As a nursery worker, I want to update task status (Pending/In Progress/Done/Skipped) and record completion dates, so that managers can track progress.

Acceptance criteria:
- Given a task with status Pending, when the worker marks it as In Progress, then the status is updated.
- Given a task with status In Progress, when the worker marks it as Done, then the status is updated and CompletedDate is automatically set to the current date/time.
- Given a task is marked Skipped, when a manager reviews it, then the skip is visible in reporting.

Priority: Must

---

#### FR-15: Monitor Nursery Through Dashboards
User story: As a nursery manager, I want dashboards showing operational overviews, so that I can monitor nursery activities at a glance.

Acceptance criteria:
- Given the dashboard is open, when data exists for the current season, then summary cards display: total active plantings, treatments this period, irrigation volume, harvest totals, and task completion rate.
- Given the dashboard is open, when the user selects a shadehouse or season filter, then all dashboard metrics update to reflect the selected scope.

Priority: Must

---

#### FR-16: Analyze Operations Data
User story: As a nursery manager, I want to analyze treatment, input, and planting data, so that I can make informed decisions about nursery operations.

Acceptance criteria:
- Given treatment records exist, when the manager views treatment analysis, then data can be grouped by input type, planting, bed, or time period.
- Given planting and harvest records exist, when the manager views yield analysis, then performance comparisons by plant variety, bed, batch, shadehouse, and season are available.

Priority: Should

---

#### FR-17: Generate Operations Reports
User story: As a nursery manager, I want to generate reports on plant growth, input usage, and treatment history, so that I can demonstrate compliance and ensure quality.

Acceptance criteria:
- Given the reporting module is open, when the user selects a report type (treatment history, input usage, harvest summary), then the report generates with filterable parameters (date range, shadehouse, plant, season).
- Given a treatment history report is generated, when it includes safety interval data from inputs, then compliance gaps (treatments within safety interval) are highlighted.

Priority: Should

---

#### FR-18: Review Bed and Shadehouse Utilization
User story: As a nursery manager, I want to review how beds and shadehouses are being utilized, so that I can optimize space allocation.

Acceptance criteria:
- Given beds exist with planting data, when the user views the utilization report, then each bed shows current planting status (occupied/empty), capacity, and current plant variety.
- Given shadehouses exist, when the user views shadehouse utilization, then aggregated metrics (total beds, occupied beds, percentage utilization) are displayed per shadehouse.

Priority: Should

---

### Commercial Domain

#### FR-19: Manage Customer List
User story: As a commercial staff member, I want to maintain a list of retail customers with contact and payment information, so that orders and invoices reference accurate customer data.

Acceptance criteria:
- Given the Customer management view is open, when the user creates a customer with name, code, email, phone, address, tax ID, and payment terms (Cash on Delivery/Net 7/Net 15/Net 30), then the customer record is saved.
- Given a customer exists, when the user deactivates them, then they no longer appear in default selection lists for new orders.

Priority: Must

---

#### FR-20: Manage Orders
User story: As a commercial staff member, I want to create and manage customer orders with line items, so that customer demand is tracked and fulfilled.

Acceptance criteria:
- Given a customer exists, when the user creates an order with order number, customer reference, order date, requested delivery date, and status (Draft), then the order is saved.
- Given an order exists, when the user adds order items with plant reference, quantity, and unit price (defaulting from Plant.DefaultUnitPrice), then line totals are calculated and the order total is updated.
- Given an order exists, when the user updates its status through the lifecycle (Draft > Confirmed > In Packing > Ready for Pickup > Delivered), then the status change is persisted.
- Given an order exists, when the user cancels it, then its status is set to Cancelled and it is excluded from active order views.

Priority: Must

---

#### FR-21: Create Packing Lists
User story: As a packing worker, I want to create packing lists that record which boxes were packed from which beds, for which plant varieties, using which packing method, so that every box is traceable from bed to customer.

Acceptance criteria:
- Given a customer and optionally an order exist, when the user creates a packing list with packing date, customer reference, and optional order reference, then the packing list is saved with status Open.
- Given a packing list is open, when the worker adds a packing list item with plant variety, source bed, number of boxes, stems per box, packing method, unit price (defaulted from Plant.DefaultUnitPrice), and packed-by name, then the line total is calculated (boxes x stems per box x unit price) and the packing list totals (total boxes, total amount) are updated.
- Given a packing list item is saved, when a manager reviews it, then full traceability is visible: which plant variety, from which bed (> batch > shadehouse), packed by whom, with which method.

Priority: Must

---

#### FR-22: Track Packing Progress
User story: As a nursery manager, I want to track the status of packing lists, so that I know which orders are being packed and which are ready.

Acceptance criteria:
- Given a packing list exists, when the user updates its status through the lifecycle (Open > In Progress > Packed > Shipped > Invoiced), then the status is persisted.
- Given packing lists exist, when the manager views the packing overview, then lists are filterable by status, date, and customer.

Priority: Must

---

#### FR-23: Generate Weekly Invoices
User story: As a commercial staff member, I want invoices to be generated weekly from packing lists, so that billing is timely, accurate, and traceable to packed goods.

Acceptance criteria:
- Given one or more packed packing lists exist for a customer within a week, when the invoice generation process runs, then a single invoice is created for that customer covering the week period, with subtotal aggregated from packing list totals.
- Given an invoice is generated, when it references packing lists, then each packing list's InvoiceId is set to the generated invoice, and the packing list status is updated to Invoiced.
- Given an invoice is generated, when the user views it, then invoice number, customer, invoice date, week number, period start/end, subtotal, tax rate, tax amount, total amount, status (Draft), and due date are populated.
- Given an invoice exists, when the user updates its status (Draft > Sent > Paid > Overdue > Cancelled), then the change is persisted.

Priority: Must

---

#### FR-24: Manage Invoice Lifecycle
User story: As a commercial staff member, I want to track invoice status and payment, so that outstanding amounts are visible and follow-up is possible.

Acceptance criteria:
- Given invoices exist, when the user views the invoice list, then invoices are sortable and filterable by status, customer, date, and amount.
- Given an invoice has status Sent and the due date has passed, when the user reviews overdue invoices, then those invoices are flagged as Overdue.

Priority: Should

---

### Cross-Domain

#### FR-25: Inspection Workflow
User story: As a nursery worker, I want to perform inspections to evaluate and assess conditions, so that issues are identified and documented.

Acceptance criteria:
- Given the Inspection section exists as one of the four main app sections, when the user opens it, then inspection-related functionality is available.

> **Note:** The specific inspection workflow, data captured, and outcomes have not been defined by the stakeholder. This requirement is a placeholder. See Open Questions.

Priority: Must (pending definition)

---

#### FR-26: Four-Section App Navigation
User story: As any user, I want the app organized into four clear sections (Inspection, Packing, Plant Care, Management), so that I can quickly navigate to the functionality I need.

Acceptance criteria:
- Given the app is loaded, when the user views the main navigation, then four sections are visible: Inspection, Packing, Plant Care, and Management.
- Given any section is selected, when the user navigates to it, then only the relevant functionality and data for that section are displayed.

Priority: Must

---

## 5. NON-FUNCTIONAL REQUIREMENTS

- **Performance:** Screens must load in under 2 seconds. Data entry forms must respond instantly to input. Packing list item entry must be optimized for speed since it is high-volume daily work.
- **Usability:** The UI must be modern, sober, simplistic, intuitive, and efficient. Users must enjoy using the tool despite heavy data input. Clean cards with rounded corners. Minimize clicks for common operations.
- **Visual design:** Color palette uses dark green, olive green, lime/light green, and white backgrounds consistent with Broton Verde branding. Typography and spacing must be clean and readable.
- **Responsiveness:** The app should be usable on tablets and desktop browsers. Mobile-friendly input is a priority since nursery workers are on their feet.
- **Security:** Row-level or role-based access control via Dataverse security model. Specific roles and permissions TBD (see Open Questions).
- **Availability:** Standard Dataverse/Power Platform availability (99.9% SLA).
- **Languages:** Not specified (see Open Questions).
- **Accessibility:** Target WCAG 2.1 AA compliance for all interactive elements.
- **Compliance:** Treatment records must support agricultural compliance reporting (treatment history, input safety intervals, environmental conditions).

---

## 6. ASSUMPTIONS

- A-01: The 18-table Dataverse schema defined in `farmtrack.dataverse.schema.json` (version 2.0.0.0) is the agreed data model and does not require structural changes for v0.1 requirements.
- A-02: The app will be deployed to a Power Platform environment separate from Enterprise DEV, using publisher prefix `inv_`.
- A-03: Worker identification is handled via simple string fields (Worker, AssignedTo, PackedBy) rather than full user management or Dataverse systemuser lookups.
- A-04: "Weekly invoice generation" means one invoice per customer per week, aggregating all packing lists for that customer within the week period.
- A-05: Invoice line-total calculation follows: boxes x stems per box x unit price.
- A-06: The Calendar table is a pre-populated date dimension used for reporting, not a dynamic scheduling system.
- A-07: Packing method options will be provided by the stakeholder before the packing module is built.
- A-08: The app is a single-tenant deployment for Broton Verde only.
- A-09: Internet connectivity is available at the nursery for all app usage.

---

## 7. CONSTRAINTS

- C-01: The app must be built as a Power Apps Code App (React 19 + TypeScript + Vite), not a Canvas or Model-Driven app.
- C-02: Backend must be Microsoft Dataverse.
- C-03: Publisher prefix must be `inv_`.
- C-04: Solution name must be `DigitalFarmTracking`.
- C-05: The existing Enterprise DEV environment (`agr_` prefix solution) must not be modified.
- C-06: The `@microsoft/power-apps` package and `powerApps()` Vite plugin must be used for Power Apps integration.
- C-07: Build output targets `dist/` directory with `index.html` entry point.

---

## 8. RISKS

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| R-01: Packing method options not defined yet | High | Medium | Placeholder choice field created. Block packing module build until values are confirmed. Use flexible choice field that can be updated. |
| R-02: Inspection workflow undefined | High | High | Section placeholder exists in navigation. Entire inspection module cannot be built until requirements are gathered. Escalate to stakeholder. |
| R-03: Worker tracking via string fields may cause data quality issues (typos, inconsistent names) | Medium | Medium | Consider adding a dropdown or autocomplete for known worker names. Defer to Sierra for UX solution. |
| R-04: Weekly invoice automation complexity | Medium | Medium | Start with manual trigger (button) for invoice generation. Automate with Power Automate or scheduled logic in a later phase. |
| R-05: Offline capability not confirmed but nursery workers are mobile | Medium | High | If offline is needed, significant architectural changes required (service workers, local cache, sync). Clarify requirement early. |
| R-06: No test framework configured | Medium | Medium | Testing relies on manual QA. Consider adding Vitest for unit tests as the codebase grows. |
| R-07: Number of concurrent users unknown | Low | Medium | Dataverse handles scaling, but UI performance should be validated with expected user counts. |

---

## 9. OPEN QUESTIONS

### Resolved (v0.2)
- ~~OQ-01~~: **RESOLVED.** Packing is per-box, not header/line-item. Each box record: plant, bed, shadehouse, barcode, box number, bundle or not (size 3 or 5), quantity, gross/net/total weight, packing type (choice), completed flag, order reference. PackingType choice values still TBD (awaiting additional screenshots from Santiago).
- ~~OQ-02~~: **DEFERRED.** Inspection section is on hold -- will be addressed in a future phase.
- ~~OQ-05~~: **RESOLVED.** Offline capability is nice-to-have, not a blocker. Build for online-first.
- ~~OQ-08~~: **RESOLVED.** Worker names are free text with a worker ID for identification. No separate Worker table needed.
- ~~OQ-09~~: **RESOLVED.** Tax rate is fixed. Invoices are in USD. Honduras central bank exchange rate (HNL->USD) must be fetched at invoice generation time.
- ~~OQ-14~~: **RESOLVED.** Build priority: Planting -> Treatment -> Irrigation -> Harvest -> Packing -> Invoicing. Inspection deferred.
- ~~OQ-15~~: **RESOLVED.** Per box: specify plant, bed, bundle or not, bundle size (3 or 5). Quantity is stems/units per box.

### Still Open
- OQ-03: How many users will use the system, and what distinct roles/permission levels are needed? -> owner: Santiago / Broton Verde
- OQ-04: Is multi-language support needed (e.g., Spanish and English)? -> owner: Santiago / Broton Verde
- OQ-06: Does the system need to integrate with any external systems (accounting software, ERP, shipping providers)? -> owner: Santiago / Broton Verde
- OQ-07: What is the target deployment environment (environment URL, region, license type)? -> owner: Santiago
- OQ-10: How should the due date on invoices be calculated? Based on customer payment terms? -> owner: Santiago / Broton Verde
- OQ-11: Is there a need for document attachments (photos of plants, treatment labels, inspection evidence)? -> owner: Santiago / Broton Verde
- OQ-12: What is the expected data volume (number of shadehouses, beds, plantings per season, treatments per day, packing lists per week)? -> owner: Santiago / Broton Verde
- OQ-13: Should the Calendar table be pre-populated or generated, and for what date range? -> owner: Santiago
- OQ-16: What are the PackingType choice values? -> owner: Santiago / Broton Verde (screenshots pending)
- OQ-17: What is the fixed tax rate percentage? -> owner: Santiago / Broton Verde
- OQ-18: What is the exchange rate source URL or API for Honduras central bank? -> owner: Santiago

---

## 10. SUGGESTED NEXT AGENT

- **Mike** to revise the data model: replace PackingList/PackingListItem with a single per-box Packing table based on the existing cr79c_ schema. Add barcode, weights, bundle fields.
- **Sierra** for architecture decisions (exchange rate API integration, component structure).
- Then **Alpha** continues the UI build with corrected data model.
