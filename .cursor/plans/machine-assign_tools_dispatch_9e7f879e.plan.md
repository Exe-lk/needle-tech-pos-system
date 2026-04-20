---
name: Machine-assign tools dispatch
overview: Add tool visibility + dispatch on `machine-assign-page`, including a safe DB-backed dispatched state, inventory decrement, and invoice line items split so totals remain correct.
todos:
  - id: api-by-number-tools
    content: Extend `GET /api/v1/rentals/by-number` to include rental tools (with tool details) and return them in response.
    status: pending
  - id: db-dispatched-qty
    content: Add `dispatchedQuantity` to `RentalTool` with Prisma migration for idempotent dispatch tracking.
    status: pending
  - id: api-dispatch-tools
    content: Create transactional dispatch endpoint to decrement `Tool.quantity` and mark rental tool line fully dispatched (Stock_Keeper allowed).
    status: pending
  - id: ui-show-tools
    content: Update `machine-assign-page` to render tool details in agreement details view and wire Assign tool button to dispatch API.
    status: pending
  - id: invoice-add-tools
    content: Update invoice generation on `machine-assign-page` to split monthly total into machine lines + tool lines, recompute totals, and keep totals unchanged.
    status: pending
isProject: false
---

## Current flow (as-is)

- UI loads pending agreements list from `GET /api/v1/rentals?status=PENDING` and agreement details from `[app/api/v1/rentals/by-number/route.ts](/Users/tharushasamarawickrama/Documents/Needltech%20/needle-tech-pos-system/app/api/v1/rentals/by-number/route.ts)`.
- Machines are assigned locally via QR scan, then persisted by `PUT /api/v1/rentals/:id` in `[app/api/v1/rentals/[id]/route.ts](/Users/tharushasamarawickrama/Documents/Needltech%20/needle-tech-pos-system/app/api/v1/rentals/[id]/route.ts)`.
- After all machines are assigned for a PENDING rental, `machine-assign-page` creates an invoice using `POST /api/v1/invoices` with line items computed inside `[app/machine-assign-page/page.tsx](/Users/tharushasamarawickrama/Documents/Needltech%20/needle-tech-pos-system/app/machine-assign-page/page.tsx)`.
- Tools already exist in the DB model as `Tool` and `RentalTool` (see `[prisma/schema.prisma](/Users/tharushasamarawickrama/Documents/Needltech%20/needle-tech-pos-system/prisma/schema.prisma)`), and rentals created from purchase orders already create `RentalTool` rows (see `[app/api/v1/rentals/from-purchase-request/route.ts](/Users/tharushasamarawickrama/Documents/Needltech%20/needle-tech-pos-system/app/api/v1/rentals/from-purchase-request/route.ts)`).

## Why tools don’t show today

- `GET /api/v1/rentals/by-number` includes `machines` but **does not include** the `Rental.tools` relation, so the page never receives tool lines to render.

## Proposed changes (safe, additive)

### 1) Show tool details in “View agreement details”

- Update `GET /api/v1/rentals/by-number` to `include: { tools: { include: { tool: true }}}` and return a `tools` array in the response (parallel to `machines`).
- Update `RentalByNumberApiData` and transformation in `[app/machine-assign-page/page.tsx](/Users/tharushasamarawickrama/Documents/Needltech%20/needle-tech-pos-system/app/machine-assign-page/page.tsx)` to store and display these tool lines in the details view.
- UI section will show (per tool line): `toolName`, `toolType`, optional `brand/model/serialNumber`, `quantity`, `unitPrice`, and dispatched state (see next section).

### 2) Add “Assign tool” button (assign full tool line at once)

Because tools are count-based (not uniquely tracked like machines) and you selected **assign all**, we’ll implement a single-click dispatch per tool line.

- **DB change**: add `dispatchedQuantity Int @default(0)` to `RentalTool` so we can prevent double-decrement and show progress. This is required because currently there’s no way to know if inventory was already decremented.
  - Files: `[prisma/schema.prisma](/Users/tharushasamarawickrama/Documents/Needltech%20/needle-tech-pos-system/prisma/schema.prisma)` + new migration.
- **New API endpoint** (recommended to avoid breaking existing machine update logic):
  - Add `POST /api/v1/rentals/:id/tools/:toolId/dispatch` (or similar) under `app/api/v1/rentals/[id]/tools/[toolId]/dispatch/route.ts`.
  - Roles should include `Stock_Keeper` (since `machine-assign-page` is used by stock keepers, and `/api/v1/tools` currently excludes that role).
  - Implementation (transactional):
    - Load `RentalTool` (rentalId+toolId) and `Tool` row.
    - Compute `remaining = rentalTool.quantity - rentalTool.dispatchedQuantity`.
    - Validate `remaining > 0`.
    - Validate `tool.quantity >= remaining`.
    - Update `tool.quantity -= remaining`.
    - Update `rentalTool.dispatchedQuantity = rentalTool.quantity`.
    - Return updated tool line + remaining dispatched.
- **UI integration**:
  - In “View agreement details”, add an **Assign tool** button per tool line, enabled only when `dispatchedQuantity < quantity`.
  - On click, call the new endpoint and update local state so the UI reflects dispatched tools immediately.

### 3) Ensure invoice includes tools without changing totals (avoid double charging)

You selected: **split machines vs tools**.

- When `machine-assign-page` auto-creates the invoice:
  - Compute `toolsMonthlySubtotal = sum(rentalTool.unitPrice * rentalTool.quantity)` from the `tools` returned by `by-number`.
  - Compute `machineMonthlySubtotal = selectedAgreement.monthlyRent - toolsMonthlySubtotal`.
  - Keep the existing machine category line construction, but use `machineMonthlySubtotal` to compute per-machine pricing.
  - Add separate invoice line items for tools:
    - `description`: tool name/type (uppercased, similar style as machines)
    - `quantity`: tool quantity
    - `unitPrice`: tool monthly unit price
    - include `vatRate` as already used
  - Recompute `subtotal`, `vatAmount`, `grandTotal` from the combined machine+tool lines.

This preserves the original agreement monthly total (because tools are moved out of machine pricing) while making tools visible and billable.

## Compatibility / risk controls

- Machine scanning, validation (`/api/v1/inventory/machines`), and rental machine assignment (`PUT /api/v1/rentals/:id`) remain unchanged.
- Tool dispatch is **additive** and idempotent via `dispatchedQuantity` (repeat clicks won’t double-decrement).
- If a rental has no tools, behavior stays identical.

## Test plan (manual)

- Load a PENDING agreement with tools.
- Verify “View agreement details” shows a Tools section.
- Click **Assign tool** → verify tool quantity decreases in DB and UI shows dispatched.
- Complete machine scanning → click **Done scanning & create invoice**.
- Verify created invoice contains both machine lines and tool lines and total matches the previous total.
- Regression: agreement with no tools behaves exactly the same as before.

