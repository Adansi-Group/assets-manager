# Toner Stock Pooling — Design

**Date:** 2026-09-23

## Problem

Toner stock is filed per printer: a record carries `location`, `room` and
`printerType`, and a replacement only finds stock when all three strings match
the printer exactly. Three bugs on 2026-09-23 all traced to that.

- The Toners page grouped stock without `room`, so two Canon imageRunner C3326i
  units at Travel House merged into one row. The row showed Down Floor a Yellow
  that belonged to the Reception unit, and the replacement refused it.
- A `222A-CEO` record named `HP Color Laser Jet Pro MFP 3303` while the printer
  was recorded as `Color Laser Jet Pro MFP 3303fdw`. Two sources for the model
  string — a hardcoded `TONER_PRINTER_MAP` in `AddTonerModal.tsx` for stock,
  free text on the Printers page for printers — and nothing holding them level.
- Tema Branch's four 222A records named an M283fdw in another branch, because
  the hardcoded map offered that printer and no other. The form made correct
  entry impossible.

Each is a different field of the same address drifting. The deeper mismatch is
that the model does not describe the business: **all cartridges live in one
store at Travel House** and are shipped to branches on request. Stock is not
per-printer and never was. The branch labels on stock records are descriptive
notes the user added "just to know the diff".

## Approach

Stock becomes a pool keyed by **cartridge type and colour**. A printer records
which cartridge it takes; a replacement finds the pool by
`printer.tonerType + colour`. `location`, `room` and `printerType` stop being
part of stock identity, so none of the three drift vectors can participate in
matching.

Pools are written to a **new `toner_stock` collection** rather than rewriting
`toners` in place, and a settings flag decides which the app reads. The old
data stays intact and readable throughout, so a bad migration is a toggle away
from being undone rather than a restore from backup.

Rejected alternatives:

- **Fallback matching** — keep per-printer records, and when an exact match
  fails deduct from any stock of the same type. Small change, reports
  untouched, but duplicate records persist and *which* row was deducted becomes
  arbitrary. Treats the symptom.
- **A model → cartridge mapping table in Firestore** — avoids a field on every
  printer, but keys on the model string, which is exactly what drifted in the
  3303 case. Reintroduces the bug it is meant to avoid.
- **Pool per location** — considered first, on the assumption each branch held
  its own stock. Wrong: there is one central store, so a location dimension
  would be fiction.

## Goals

- One stock set per cartridge type, shared by every printer that takes it.
- Replacement matching that cannot fail through a mistyped room or a model
  string spelled two ways.
- A migration the user can preview, and undo without data loss.

## Non-goals

- **Tracking shipped cartridges.** Once stock is one HQ pool the app cannot say
  what has already gone out to a branch. Today's per-branch rows implied that
  but did not deliver it. A transfers feature is not in scope; the user
  accepted this consequence knowingly.
- Changing the monthly station report (see Reports below — it needs nothing).
- Deleting the `toners` collection. That is a separate task once the pools have
  been trusted for a while.

## Data model

### Printer

One new field on `Printer` (`src/types/printer.ts`):

- `tonerType?: string` — the cartridge this printer takes, e.g. `"222A"`

Optional in the type so existing documents load. Required in the Add/Edit
Printer form going forward. A printer without it cannot have a cartridge
replaced, and says so.

### Toner stock

New collection `toner_stock`, one document per cartridge and colour:

```ts
export interface TonerStock {
  id: string;
  tonerType: string;    // "222A"
  colorType: string;    // "Black" | "Cyan" | "Magenta" | "Yellow" | "Color"
  quantity: number;
  initialQuantity?: number;
  dateBrought: string;
  lastCheckedDate?: string;
  costPerUnit?: number;
}
```

`location`, `room` and `printerType` are **not** carried over. A field that
exists but is not matched on is how the current bugs stayed invisible.

`status` continues to be derived on read from `src/toners/stockLevel.ts` and is
never trusted from the stored value, as today.

Uniqueness of `(tonerType, colorType)` is enforced in the service layer: a
write that would create a second document for an existing pair is rejected.

### Which printers use a pool

Derived, never stored: the printers whose `tonerType` matches. Always current,
with nothing to keep in sync by hand.

## Matching and replacement

`replacePrinterToner()` resolves stock by `printer.tonerType + colour`. The
four-field comparison in `src/toners/stockMatching.ts` collapses to two, and
most of that module and of `src/toners/grouping.ts` is deleted.

The PIXMA rule is unchanged: a PIXMA pool holds `Black` and `Color`, and the
printer-level Yellow → Color translation stays where it is.

Two new failure cases, both stated plainly rather than failing silently:

- Printer has no `tonerType` — *"Set the toner type on this printer before
  replacing a cartridge."*
- No pool for that cartridge and colour — *"No 222A Magenta in stock. Add it on
  the Toners page."*

The existing empty-pool error is unchanged.

`toner_replacements` records are untouched. They keep their own snapshot of
location, room and printer model at the time of replacement, which stays
accurate as history and is what the monthly report narrates from.

## Migration

A one-off admin screen at `/toners/migrate`, reached from a card on the
Settings page and hidden once `useTonerPools` is on. Nothing is written until
the final step.

1. **Assign a cartridge to each printer.** Pre-filled by inferring from
   currently linked stock (old record matching the printer's
   location + room + model). The COO's Office 3303fdw has no stock and so gets
   no suggestion; the user picks `222A`.
2. **Merge cartridge names.** Proposes `222A-CEO → 222A`. Nothing merges unless
   the user confirms.
3. **Preview.** The resulting pools, merges highlighted, plus warnings.
4. **Apply.** Writes `toner_stock` documents and sets `tonerType` on printers,
   in batches. `toners` is left untouched.

The planner is a pure function —
`(oldStock, printers, aliases) → { pools, printerTypes, warnings }` — so every
merge rule is tested without Firestore. This matters: the Firestore database
cannot be read from a script on this account (Google-only auth), so the tests
are the only pre-flight check available.

### Expected result for current data

32 records → 24 pools across 6 cartridge types. Only 8 records merge:

| Cartridge | Merges | Result |
|---|---|---|
| `222A` | `222A` (Tema Branch) + `222A-CEO` (CEO's Office) | Black 3, Cyan 1, Magenta 2, Yellow 5 |
| `CARTRIDGE 069` | Nester Square Branch + Travel House HR Manager Office | Black 4, Cyan 4, Magenta 4, Yellow 4 |

The CARTRIDGE 069 merge follows from central storage rather than from an
explicit request; the user confirmed it.

These sums are a starting position, not a target. The user will recount the
cupboard and correct the quantities once the pools exist, so the migration has
to get the *shape* right — the right pools, the right merges, nothing lost —
while being wrong about a quantity costs only an edit. This is why summing is
safe even though the export predates recent edits.

### Warnings the planner raises

- A printer left with no cartridge assigned.
- **PIXMA 446 Cyan 1** — a colour a two-colour printer cannot take, currently
  hidden inside a group. Offered in the preview with a keep/drop checkbox; the
  user decides on seeing it.
- Any pool landing at zero.

### Switching over and rollback

There is no feature flag. It was considered and rejected: a flag would have to
gate writes as well as reads, leaving two live write paths through replacement,
Add Toner and the reports for as long as it existed, and dual write paths are
where data bugs breed.

Safety comes from the migration being additive instead. `toners` is never
written to and never deleted, so rolling back is reverting the deploy — the old
collection is still there, complete. The user is also recounting the cupboard
after migrating, which absorbs any quantity error the merge introduces.

Deleting `toners` is a separate, later task, once the pools have been trusted.

## UI changes

### Toners page

Six rows, one per cartridge, replacing nine printer-sets:

| Cartridge | Colour | Qty | Status | Used by | Date | Actions |
|---|---|---|---|---|---|---|
| 222A | Magenta ⌄ | 2 | Critical | 3 printers | 2026-02-13 | Edit · Delete |

"Used by" is a chip showing the count; clicking it lists the printers.

**Add Toner** drops from seven fields to three — cartridge, colour, quantity.
`TONER_PRINTER_MAP` and the printer/location/room fields are removed from that
form entirely.

The amber unlinked panel is repurposed, not retired. It now flags **printers
with no cartridge assigned** and **pools no printer uses** (a retired printer
leaving orphan stock).

### Add/Edit Printer

A required Toner Type select, fed from the existing `toner_types` collection,
with the same "add new type" affordance the toner form already has.

## Reports

### Consumables Management Report — changes

`src/reports/consumables/model.ts` keys by `tonerType|colorType` instead of
`location|room|printerType|colorType`.

- Reorder line: `"Reorder Magenta 222A for Travel House / CEO's Office; 2 left"`
  becomes `"Reorder Magenta 222A — 2 left; used by 3 printers"`.
- Docx table columns (`renderDocx.ts`):
  `Location · Office · Printer · Toner · Colour · Left · Status` becomes
  `Cartridge · Colour · Left · Status · Used by`, where **Used by lists the
  offices in full** — `Travel House (CEO's Office), Travel House (COO's
  Office), Tema Branch`.

The location columns go because they would be lying: every cartridge is at
Travel House. The report gains what it did not say before — what each cartridge
feeds.

### Toner Reports page

Columns change the same way.

### Station monthly report — no change

`narrate.ts` reads only `activity.*`, built from `toner_replacements`, which
keep their own location and printer snapshot. The standing-inventory
`consumables` section in `station/model.ts:177` is built but never read (see
the note in `detailed-asset-report` memory); it is left alone rather than
churned.

## Testing

Pure modules, following the existing `src/toners/` convention:

- Pool identity and lookup by `tonerType + colour`.
- The migration planner: merges, alias mapping, each warning, and that the
  expected-result table above is produced from the real record set.
- Uniqueness enforcement on `(tonerType, colorType)`.
- Consumables report keying and the new reorder wording.
- Existing `grouping.ts` and `stockMatching.ts` tests shrink with the modules;
  the C3326i and 3303 regression cases are rewritten against the pool model so
  the bugs stay covered.

## Prerequisites

- **Firestore rules.** There is no `firestore.rules` in the repo; rules are
  managed in the Firebase console. The `toner_stock` collection may need a rule
  added there before writes succeed. This is a manual step outside the repo.

## Open items

- Whether to drop or keep the PIXMA 446 Cyan 1 — deferred to the migration
  preview by design.
