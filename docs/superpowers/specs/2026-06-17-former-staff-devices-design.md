# Former Staff Devices — Design

**Date:** 2026-06-17

## Problem

Laptops and phones left behind by staff who have left the organization are
sitting physically on hand but have never been recorded in the system. We need
a way to record each departed staff member and the device they left, and have
that device flow back into available gadget stock so it can be reassigned.

## Approach

A returned device is modeled as a normal entry in the existing `gadgets`
Firestore collection, carrying a few extra "who left it" fields. This keeps a
single source of truth (no duplicate device records) and means a recorded device
automatically appears as **In-Stock** on the Laptops/Smartphones pages, ready to
reassign. The new page is a filtered view of gadgets that were returned by
departed staff, plus an "Add Returned Device" form.

Rejected alternative: a separate `returnedDevices` collection — it would
duplicate devices and make the "return to stock" requirement awkward to keep in
sync.

## Data model

Add three optional fields to the existing `Gadget` type (`src/types/gadget.ts`):

- `returnedFrom?: string` — name of the staff member who left
- `formerDepartment?: string` — their department
- `staffLeftDate?: string` — date they left (ISO date string)

Reuse existing `condition` (New/Good/Fair/Poor) and `notes` fields. A returned
device is identified by having `returnedFrom` set.

## Components

- **`src/pages/gadgets/ReturnedDevices.tsx`** — modeled on `Laptops.tsx`. Stat
  cards (Total Returned, Still In-Stock, Reassigned), search, a table (Staff
  Name, Department, Date Left, Device, Serial/IMEI, Condition, Current Status),
  view/edit/delete, and export. Lists every gadget with `returnedFrom` set.
- **`src/components/AddReturnedDeviceModal.tsx`** — focused form: Staff Name,
  Department, Date Left, Device Type (Laptop/Phone), Model, Serial/IMEI,
  Condition, Notes. On save creates a gadget with `status: "In-Stock"` and the
  returned fields populated.

## Wiring

- `gadgetsService.ts`: persist the three new fields in `addGadget`; add a
  `getReturnedDevices()` helper that returns gadgets where `returnedFrom` is set.
  `updateGadget` already persists arbitrary fields generically.
- `App.tsx`: routes `/gadgets/returned` and `/gadgets/returned/add` under the
  `view_gadgets` permission guard.
- `AdminLayout.tsx`: a **"Former Staff Devices"** link in the Gadgets dropdown
  and a breadcrumb label for `/gadgets/returned`.

## Data flow

1. User opens Former Staff Devices → "Add Returned Device".
2. Fills the form → `addGadget({ deviceType, model, serialNumber/imei,
   status: "In-Stock", returnedFrom, formerDepartment, staffLeftDate, condition,
   notes })`.
3. Page reloads via `getReturnedDevices()`. Device also appears In-Stock on the
   relevant Laptops/Smartphones page.
4. Editing/deleting reuses `updateGadget`/`deleteGadget`.

## Out of scope (YAGNI)

- No separate "former staff" master list.
- No automatic reassignment workflow — reassignment uses the existing gadget
  edit flow.
