# Toner Stock Pooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-printer toner stock with one shared pool per cartridge type and colour, so a replacement can never fail because a room or model string was spelled two ways.

**Architecture:** Printers gain a `tonerType` field naming the cartridge they take. Stock moves to a new `toner_stock` collection keyed only by `tonerType + colorType`. Replacement resolves stock by `printer.tonerType + colour`, so location, room and model stop participating in matching. A one-off admin screen migrates the old `toners` collection into pools; `toners` is never written to or deleted, so rollback is reverting the deploy.

**Tech Stack:** React 19 + TypeScript, Vite, Firebase Firestore, Vitest, Tailwind, SweetAlert2 (`Swal`), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-09-23-toner-stock-pooling-design.md`

## Global Constraints

- **Collection name is exactly `toner_stock`.** Firestore rules live in the Firebase console, not this repo — the collection may need a rule added there before writes succeed. If migration writes fail with permission errors, that is the cause, not the code.
- **`toners` collection is read-only for all new code.** Never write to it, never delete from it.
- **`toner_replacements` is untouched.** It stores its own snapshot of location/room/printer model; that snapshot stays and remains correct as history.
- **Status is always derived on read** via `src/toners/stockLevel.ts`. Never trust a stored `status`.
- **Pure logic lives in `src/toners/*.ts` with a colocated `*.test.ts`**, matching `stockLevel.ts`. No React and no Firestore imports in those modules.
- **Firestore cannot be read from a script on this account** (Google-only auth). Tests on pure modules are the only pre-flight check available — no task may rely on inspecting live data to prove itself.
- **Exact error copy** (used verbatim in Task 6):
  - `Set the toner type on this printer before replacing a cartridge.`
  - `No {tonerType} {colour} in stock. Add it on the Toners page.`
- **Exact report copy** (used verbatim in Task 9):
  - Reorder line: `Reorder {colour} {tonerType} — {qty} left; used by {n} printers`
- **Test command:** `npm test` (from `adansi-inventory/`). Single file: `npx vitest run <path>`.
- **All paths below are relative to `adansi-inventory/`.**
- **Commit messages** end with:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```

---

## File Structure

**Create:**
- `src/toners/pools.ts` — pure pool identity, lookup, and which printers use a pool
- `src/toners/pools.test.ts`
- `src/toners/migrationPlan.ts` — pure migration planner
- `src/toners/migrationPlan.test.ts`
- `src/services/tonerStockService.ts` — Firestore CRUD for `toner_stock`
- `src/pages/TonerMigration.tsx` — the one-off migration screen

**Modify:**
- `src/types/printer.ts` — add `tonerType`
- `src/types/toner.ts` — add `TonerStock`
- `src/components/AddPrinterModal.tsx` — Toner Type select
- `src/services/Tonerreplacementservice.ts` — match by `tonerType + colour`
- `src/pages/Toners.tsx` — pool rows
- `src/components/AddTonerModal.tsx` — three fields
- `src/reports/consumables/model.ts` — key by `tonerType|colorType`
- `src/reports/consumables/renderDocx.ts` — new columns
- `src/pages/TonerReports.tsx` — new columns
- `src/App.tsx` — `/toners/migrate` route
- `src/pages/Settings.tsx` — migration entry card

**Delete (Task 11):**
- `src/toners/grouping.ts`, `src/toners/grouping.test.ts` — superseded by `pools.ts`

**Shrinks (Task 11):**
- `src/toners/stockMatching.ts` — four-field matching no longer used

---

## Execution Gate

**Tasks 1–5 are safe to ship at any time**: they add the migration screen without changing how the app reads stock. The app keeps using `toners` throughout.

**Between Task 5 and Task 6 the user must actually run the migration** at `/toners/migrate`. Tasks 6–11 switch the app over to reading `toner_stock`; if the pools do not exist yet, every screen will show empty stock. Do not start Task 6 until the user confirms the migration has run and the preview numbers looked right.

---

### Task 1: Pool model

Pure identity and lookup for pools. Everything later builds on this.

**Files:**
- Create: `src/toners/pools.ts`
- Test: `src/toners/pools.test.ts`

**Interfaces:**
- Consumes: `Toner`/`TonerStock` from `src/types/toner.ts`, `Printer` from `src/types/printer.ts`
- Produces:
  - `normalizeType(value?: string): string`
  - `poolKey(tonerType: string, colorType: string): string`
  - `findPool<P extends PoolLike>(pools: P[], tonerType: string, colorType: string): P | undefined`
  - `printersUsing<P extends { tonerType?: string }>(printers: P[], tonerType: string): P[]`
  - `type PoolLike = { tonerType: string; colorType: string }`

- [ ] **Step 1: Write the failing test**

Create `src/toners/pools.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findPool, poolKey, printersUsing } from "./pools";

const pool = (tonerType: string, colorType: string, quantity = 1) =>
  ({ id: `${tonerType}-${colorType}`, tonerType, colorType, quantity, dateBrought: "2026-02-13" });

describe("poolKey", () => {
  it("is the same for the same cartridge and colour", () => {
    expect(poolKey("222A", "Magenta")).toBe(poolKey("222A", "Magenta"));
  });

  it("forgives casing and stray spacing", () => {
    expect(poolKey("  222a ", "magenta")).toBe(poolKey("222A", "Magenta"));
  });

  it("separates colours of the same cartridge", () => {
    expect(poolKey("222A", "Magenta")).not.toBe(poolKey("222A", "Cyan"));
  });

  it("separates cartridges of the same colour", () => {
    expect(poolKey("222A", "Magenta")).not.toBe(poolKey("207A", "Magenta"));
  });
});

describe("findPool", () => {
  const pools = [pool("222A", "Magenta", 2), pool("222A", "Cyan", 1), pool("207A", "Magenta", 3)];

  it("finds the pool for a cartridge and colour", () => {
    expect(findPool(pools, "222A", "Magenta")?.quantity).toBe(2);
  });

  it("forgives casing", () => {
    expect(findPool(pools, "222a", "MAGENTA")?.quantity).toBe(2);
  });

  it("returns nothing when the cartridge has no pool for that colour", () => {
    expect(findPool(pools, "222A", "Yellow")).toBeUndefined();
  });
});

describe("printersUsing", () => {
  const printers = [
    { id: "ceo", tonerType: "222A" },
    { id: "coo", tonerType: "222A" },
    { id: "tema", tonerType: "222A" },
    { id: "accounts", tonerType: "207A" },
    { id: "unset" },
  ];

  it("lists every printer taking that cartridge", () => {
    expect(printersUsing(printers, "222A").map((p) => p.id)).toEqual(["ceo", "coo", "tema"]);
  });

  it("ignores printers with no cartridge set", () => {
    expect(printersUsing(printers, "222A").some((p) => p.id === "unset")).toBe(false);
  });

  it("returns nothing for a cartridge no printer takes", () => {
    expect(printersUsing(printers, "C-EXV65")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/toners/pools.test.ts`
Expected: FAIL — `Failed to resolve import "./pools"`

- [ ] **Step 3: Write the implementation**

Create `src/toners/pools.ts`:

```ts
// src/toners/pools.ts
//
// Stock is one pool per cartridge and colour.
//
// Every cartridge lives in one store at Travel House and is shipped to branches
// on request, so stock was never per-printer. Keying it by location, room and
// printer model meant three strings had to agree across two screens that each
// let you type them freely — and when they disagreed the Toners page still
// showed a quantity while the replacement refused it.
//
// A pool is addressed by what you buy: the cartridge and the colour. Which
// printers draw on it is derived from the printers themselves, so there is
// nothing to keep in step by hand.
//
// Pure: no React, no Firestore.

/** Compare the way a person would; casing and spacing are typing noise. */
export const normalizeType = (value?: string) =>
  value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";

export type PoolLike = { tonerType: string; colorType: string };

/** The address of a pool: what cartridge, what colour. */
export function poolKey(tonerType: string, colorType: string): string {
  return `${normalizeType(tonerType)}|${normalizeType(colorType)}`;
}

/** The pool a cartridge and colour name, if it exists. */
export function findPool<P extends PoolLike>(
  pools: P[],
  tonerType: string,
  colorType: string
): P | undefined {
  const wanted = poolKey(tonerType, colorType);
  return pools.find((pool) => poolKey(pool.tonerType, pool.colorType) === wanted);
}

/** Every printer that takes this cartridge. Derived, so it cannot go stale. */
export function printersUsing<P extends { tonerType?: string }>(
  printers: P[],
  tonerType: string
): P[] {
  const wanted = normalizeType(tonerType);
  if (!wanted) return [];
  return printers.filter((printer) => normalizeType(printer.tonerType) === wanted);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/toners/pools.test.ts`
Expected: PASS, 10 tests

- [ ] **Step 5: Commit**

```bash
git add src/toners/pools.ts src/toners/pools.test.ts
git commit -m "$(cat <<'EOF'
feat(toners): add pure pool identity and lookup

Stock is addressed by cartridge and colour rather than by location,
room and printer model.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Migration planner

The riskiest logic in the project, and the only part that can be proven before touching live data. Pure function, exhaustively tested.

**Files:**
- Create: `src/toners/migrationPlan.ts`
- Test: `src/toners/migrationPlan.test.ts`

**Interfaces:**
- Consumes: `normalizeType`, `poolKey` from `src/toners/pools.ts` (Task 1); `Toner` from `src/types/toner.ts`; `Printer` from `src/types/printer.ts`
- Produces:
  - `inferPrinterTonerType(printer, oldStock): string | undefined`
  - `planMigration(input: MigrationInput): MigrationPlan`
  - `type MigrationInput = { oldStock: Toner[]; printers: Printer[]; aliases?: Record<string, string>; dropped?: string[] }`
  - `type PlannedPool = { tonerType: string; colorType: string; quantity: number; initialQuantity?: number; dateBrought: string; sources: Toner[] }`
  - `type MigrationWarning = { kind: "printer-without-cartridge" | "impossible-colour" | "empty-pool"; message: string; ref: string }`
  - `type MigrationPlan = { pools: PlannedPool[]; printerTypes: Record<string, string>; warnings: MigrationWarning[] }`

Note on `dropped`: entries are `poolKey()` values (e.g. `"pixma 446|cyan"`), so the caller ticks a checkbox against a previewed pool.

- [ ] **Step 1: Write the failing test**

Create `src/toners/migrationPlan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { inferPrinterTonerType, planMigration } from "./migrationPlan";
import { poolKey } from "./pools";
import type { Toner } from "../types/toner";
import type { Printer } from "../types/printer";

const stock = (over: Partial<Toner> & { id: string }): Toner =>
  ({
    location: "Travel House",
    room: "CEO's Office",
    printerType: "HP Color Laser Jet Pro MFP 3303",
    tonerType: "222A-CEO",
    colorType: "Black",
    quantity: 1,
    dateBrought: "2026-02-13",
    ...over,
  }) as Toner;

const printer = (over: Partial<Printer> & { id: string }): Printer =>
  ({
    location: "Travel House",
    room: "CEO's Office",
    model: "HP Color Laser Jet Pro MFP 3303",
    printerColorType: "black",
    quantity: 1,
    accessories: [],
    status: "Active",
    date: "2026-01-26",
    ...over,
  }) as Printer;

describe("inferPrinterTonerType", () => {
  it("takes the cartridge from stock currently filed against that printer", () => {
    const found = inferPrinterTonerType(printer({ id: "p" }), [stock({ id: "s" })]);

    expect(found).toBe("222A-CEO");
  });

  it("forgives casing and spacing when matching the old address", () => {
    const record = stock({ id: "s", room: "  ceo's   OFFICE " });

    expect(inferPrinterTonerType(printer({ id: "p" }), [record])).toBe("222A-CEO");
  });

  it("suggests nothing for a printer with no stock of its own", () => {
    const coo = printer({ id: "coo", room: "COO's Office", model: "Color Laser Jet Pro MFP 3303fdw" });

    expect(inferPrinterTonerType(coo, [stock({ id: "s" })])).toBeUndefined();
  });
});

describe("planMigration", () => {
  it("merges two cartridge names into one pool when aliased", () => {
    const plan = planMigration({
      oldStock: [
        stock({ id: "ceo", tonerType: "222A-CEO", colorType: "Black", quantity: 1 }),
        stock({ id: "tema", tonerType: "222A", colorType: "Black", quantity: 2, location: "Tema Branch", room: undefined }),
      ],
      printers: [],
      aliases: { "222A-CEO": "222A" },
    });

    expect(plan.pools).toHaveLength(1);
    expect(plan.pools[0].tonerType).toBe("222A");
    expect(plan.pools[0].quantity).toBe(3);
    expect(plan.pools[0].sources.map((s) => s.id)).toEqual(["ceo", "tema"]);
  });

  it("leaves unaliased cartridges as separate pools", () => {
    const plan = planMigration({
      oldStock: [
        stock({ id: "a", tonerType: "222A", colorType: "Black", quantity: 1 }),
        stock({ id: "b", tonerType: "207A", colorType: "Black", quantity: 2 }),
      ],
      printers: [],
    });

    expect(plan.pools).toHaveLength(2);
  });

  it("keeps colours of one cartridge in separate pools", () => {
    const plan = planMigration({
      oldStock: [
        stock({ id: "a", tonerType: "222A", colorType: "Black", quantity: 1 }),
        stock({ id: "b", tonerType: "222A", colorType: "Cyan", quantity: 2 }),
      ],
      printers: [],
    });

    expect(plan.pools.map((p) => p.colorType).sort()).toEqual(["Black", "Cyan"]);
  });

  it("sums initialQuantity so the recommendation badge keeps a denominator", () => {
    const plan = planMigration({
      oldStock: [
        stock({ id: "a", tonerType: "222A", colorType: "Black", quantity: 1, initialQuantity: 4 }),
        stock({ id: "b", tonerType: "222A", colorType: "Black", quantity: 2, initialQuantity: 6 }),
      ],
      printers: [],
    });

    expect(plan.pools[0].initialQuantity).toBe(10);
  });

  it("keeps the earliest dateBrought of a merged pool", () => {
    const plan = planMigration({
      oldStock: [
        stock({ id: "a", tonerType: "222A", colorType: "Black", dateBrought: "2026-02-14" }),
        stock({ id: "b", tonerType: "222A", colorType: "Black", dateBrought: "2026-02-13" }),
      ],
      printers: [],
    });

    expect(plan.pools[0].dateBrought).toBe("2026-02-13");
  });

  it("assigns each printer the cartridge inferred from its old stock", () => {
    const plan = planMigration({
      oldStock: [stock({ id: "s" })],
      printers: [printer({ id: "ceo" })],
      aliases: { "222A-CEO": "222A" },
    });

    expect(plan.printerTypes).toEqual({ ceo: "222A" });
  });

  it("warns about a printer it cannot assign a cartridge to", () => {
    const coo = printer({ id: "coo", room: "COO's Office", model: "Color Laser Jet Pro MFP 3303fdw" });
    const plan = planMigration({ oldStock: [stock({ id: "s" })], printers: [coo] });

    expect(plan.warnings.filter((w) => w.kind === "printer-without-cartridge")).toHaveLength(1);
    expect(plan.warnings[0].ref).toBe("coo");
  });

  // PIXMA is a two-colour printer; a Cyan record against it is junk the old
  // grouped view hid.
  it("warns about a colour a PIXMA cartridge cannot have", () => {
    const plan = planMigration({
      oldStock: [stock({ id: "c", tonerType: "PIXMA 446", colorType: "Cyan", quantity: 1 })],
      printers: [],
    });

    expect(plan.warnings.some((w) => w.kind === "impossible-colour")).toBe(true);
  });

  it("omits a pool the caller chose to drop", () => {
    const plan = planMigration({
      oldStock: [
        stock({ id: "c", tonerType: "PIXMA 446", colorType: "Cyan", quantity: 1 }),
        stock({ id: "b", tonerType: "PIXMA 446", colorType: "Black", quantity: 9 }),
      ],
      printers: [],
      dropped: [poolKey("PIXMA 446", "Cyan")],
    });

    expect(plan.pools.map((p) => p.colorType)).toEqual(["Black"]);
  });

  it("warns about a pool that lands at zero", () => {
    const plan = planMigration({
      oldStock: [stock({ id: "z", tonerType: "222A", colorType: "Cyan", quantity: 0 })],
      printers: [],
    });

    expect(plan.warnings.some((w) => w.kind === "empty-pool")).toBe(true);
  });

  it("loses no stock: every source record lands in exactly one pool", () => {
    const records = [
      stock({ id: "a", tonerType: "222A", colorType: "Black" }),
      stock({ id: "b", tonerType: "222A-CEO", colorType: "Black" }),
      stock({ id: "c", tonerType: "207A", colorType: "Cyan" }),
    ];
    const plan = planMigration({ oldStock: records, printers: [], aliases: { "222A-CEO": "222A" } });

    const landed = plan.pools.flatMap((p) => p.sources.map((s) => s.id)).sort();
    expect(landed).toEqual(["a", "b", "c"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/toners/migrationPlan.test.ts`
Expected: FAIL — `Failed to resolve import "./migrationPlan"`

- [ ] **Step 3: Write the implementation**

Create `src/toners/migrationPlan.ts`:

```ts
// src/toners/migrationPlan.ts
//
// Turning per-printer stock records into pools, as a plan you can look at
// before anything is written.
//
// The Firestore database cannot be read from a script on this account, so there
// is no way to rehearse this against live data. That makes the planner a pure
// function on purpose: everything it decides is decided here, where tests can
// reach it, and the screen that calls it only renders and writes.
//
// Pure: no React, no Firestore.

import { normalizeType, poolKey } from "./pools";
import type { Toner } from "../types/toner";
import type { Printer } from "../types/printer";

export type PlannedPool = {
  tonerType: string;
  colorType: string;
  quantity: number;
  initialQuantity?: number;
  dateBrought: string;
  /** The old records folded into this pool, so the preview can show its working. */
  sources: Toner[];
};

export type MigrationWarning = {
  kind: "printer-without-cartridge" | "impossible-colour" | "empty-pool";
  message: string;
  /** Printer id, or a poolKey, depending on kind. */
  ref: string;
};

export type MigrationInput = {
  oldStock: Toner[];
  printers: Printer[];
  /** Cartridge names to fold together, e.g. { "222A-CEO": "222A" }. */
  aliases?: Record<string, string>;
  /** poolKey values the user ticked to discard. */
  dropped?: string[];
};

export type MigrationPlan = {
  pools: PlannedPool[];
  /** printer id -> cartridge name. */
  printerTypes: Record<string, string>;
  warnings: MigrationWarning[];
};

/** A PIXMA takes one combined colour cartridge; CMY against it is junk. */
const PIXMA_COLOURS = new Set(["black", "color"]);

function resolveAlias(tonerType: string, aliases: Record<string, string>): string {
  const match = Object.keys(aliases).find((from) => normalizeType(from) === normalizeType(tonerType));
  return match ? aliases[match] : tonerType;
}

/**
 * The cartridge a printer takes, read from whatever stock is currently filed
 * against its old address. Printers with no stock get no suggestion rather than
 * a guess — the COO's Office 3303fdw is exactly that case.
 */
export function inferPrinterTonerType(printer: Printer, oldStock: Toner[]): string | undefined {
  const match = oldStock.find(
    (record) =>
      normalizeType(record.location) === normalizeType(printer.location) &&
      normalizeType(record.room) === normalizeType(printer.room) &&
      normalizeType(record.printerType) === normalizeType(printer.model)
  );
  return match?.tonerType;
}

export function planMigration({
  oldStock,
  printers,
  aliases = {},
  dropped = [],
}: MigrationInput): MigrationPlan {
  const warnings: MigrationWarning[] = [];
  const droppedKeys = new Set(dropped);
  const byKey = new Map<string, PlannedPool>();

  for (const record of oldStock) {
    const tonerType = resolveAlias(record.tonerType, aliases);
    const key = poolKey(tonerType, record.colorType);
    if (droppedKeys.has(key)) continue;

    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += Number(record.quantity) || 0;
      if (record.initialQuantity !== undefined) {
        existing.initialQuantity = (existing.initialQuantity ?? 0) + Number(record.initialQuantity);
      }
      // Earliest, so a merged pool does not look newer than its oldest stock.
      if (record.dateBrought < existing.dateBrought) existing.dateBrought = record.dateBrought;
      existing.sources.push(record);
    } else {
      byKey.set(key, {
        tonerType,
        colorType: record.colorType,
        quantity: Number(record.quantity) || 0,
        initialQuantity:
          record.initialQuantity === undefined ? undefined : Number(record.initialQuantity),
        dateBrought: record.dateBrought,
        sources: [record],
      });
    }
  }

  const pools = [...byKey.values()];

  for (const pool of pools) {
    if (
      normalizeType(pool.tonerType).includes("pixma") &&
      !PIXMA_COLOURS.has(normalizeType(pool.colorType))
    ) {
      warnings.push({
        kind: "impossible-colour",
        message: `${pool.colorType} ${pool.tonerType} — a PIXMA takes only Black and Color. This looks like a mistaken record.`,
        ref: poolKey(pool.tonerType, pool.colorType),
      });
    }
    if (pool.quantity === 0) {
      warnings.push({
        kind: "empty-pool",
        message: `${pool.colorType} ${pool.tonerType} has none left.`,
        ref: poolKey(pool.tonerType, pool.colorType),
      });
    }
  }

  const printerTypes: Record<string, string> = {};
  for (const printer of printers) {
    const inferred = inferPrinterTonerType(printer, oldStock);
    if (inferred) {
      printerTypes[printer.id] = resolveAlias(inferred, aliases);
    } else {
      warnings.push({
        kind: "printer-without-cartridge",
        message: `${printer.model} at ${printer.location}${printer.room ? ` (${printer.room})` : ""} has no stock to infer a cartridge from. Choose one.`,
        ref: printer.id,
      });
    }
  }

  return { pools, printerTypes, warnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/toners/migrationPlan.test.ts`
Expected: PASS, 14 tests

- [ ] **Step 5: Anchor the planner to the real record set**

The spec states what this migration must produce from the live data. Assert it,
so a later change to the merge rules cannot silently alter the outcome.

Create `src/toners/migrationPlan.fixture.ts` holding the 32 records exported on
2026-09-23 (`~/Downloads/toners_2026-09-23 (1).csv`). Full contents:

```ts
// src/toners/migrationPlan.fixture.ts
//
// The live stock as exported on 2026-09-23, before pooling. Kept verbatim so
// the migration's expected output is pinned to real data rather than to
// invented examples. Firestore cannot be read from a test on this account, so
// this fixture is the closest thing to a rehearsal that exists.

import type { Toner } from "../types/toner";

export const REAL_STOCK: Toner[] = [
  { id: "r0", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Cyan", quantity: 3, dateBrought: "2026-02-16" },
  { id: "r1", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Yellow", quantity: 4, dateBrought: "2026-02-16" },
  { id: "r2", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Magenta", quantity: 1, dateBrought: "2026-02-16" },
  { id: "r3", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Cyan", quantity: 0, dateBrought: "2026-02-16" },
  { id: "r4", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Yellow", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r5", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Magenta", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r6", location: "Travel House", room: "Down Floor", printerType: "Canon imageRunner C3326i", tonerType: "C-EXV65", colorType: "Black", quantity: 4, dateBrought: "2026-02-14" },
  { id: "r7", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Yellow", quantity: 5, dateBrought: "2026-02-14" },
  { id: "r8", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Cyan", quantity: 2, dateBrought: "2026-02-14" },
  { id: "r9", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Black", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r10", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Yellow", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r11", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Black", quantity: 4, dateBrought: "2026-02-14" },
  { id: "r12", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Black", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r13", location: "Travel House", room: "Cashier Office", printerType: "Canon PIXMA TS3440", tonerType: "PIXMA 446", colorType: "Black", quantity: 9, dateBrought: "2026-02-14" },
  { id: "r14", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Black", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r15", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Cyan", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r16", location: "Travel House", room: "HR Manager Office", printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Cyan", quantity: 1, dateBrought: "2026-02-14" },
  { id: "r17", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Magenta", quantity: 3, dateBrought: "2026-02-14" },
  { id: "r18", location: "Travel House", room: "Cashier Office", printerType: "Canon PIXMA TS3440", tonerType: "PIXMA 446", colorType: "Color", quantity: 4, dateBrought: "2026-02-14" },
  { id: "r19", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Magenta", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r20", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Yellow", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r21", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Black", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r22", location: "Tema Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "222A", colorType: "Black", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r23", location: "Nester Square Branch", room: undefined, printerType: "i-SENSYS MF752Cdw", tonerType: "CARTRIDGE 069", colorType: "Yellow", quantity: 3, dateBrought: "2026-02-13" },
  { id: "r24", location: "Travel House", room: "Cashier Office", printerType: "Canon PIXMA TS3440", tonerType: "PIXMA 446", colorType: "Cyan", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r25", location: "Travel House", room: "Account Office", printerType: "HP Color LaserJet Pro MFP M283fdw", tonerType: "207A", colorType: "Magenta", quantity: 3, dateBrought: "2026-02-13" },
  { id: "r26", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Magenta", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r27", location: "Travel House", room: "First Floor", printerType: "Canon imageRunner C3025i", tonerType: "C-EXV54", colorType: "Magenta", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r28", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Cyan", quantity: 2, dateBrought: "2026-02-13" },
  { id: "r29", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Cyan", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r30", location: "Travel House", room: "CEO's Office", printerType: "HP Color Laser Jet Pro MFP 3303", tonerType: "222A-CEO", colorType: "Yellow", quantity: 1, dateBrought: "2026-02-13" },
  { id: "r31", location: "Ashaley Botwe Branch", room: undefined, printerType: "HP Color LaserJet Pro MFP M479fdw", tonerType: "415A", colorType: "Black", quantity: 2, dateBrought: "2026-02-13" },
];
```

Append to `src/toners/migrationPlan.test.ts`:

```ts
describe("planMigration on the real 2026-09-23 record set", () => {
  const plan = planMigration({
    oldStock: REAL_STOCK,
    printers: [],
    aliases: { "222A-CEO": "222A" },
  });

  const find = (tonerType: string, colorType: string) =>
    plan.pools.find((p) => p.tonerType === tonerType && p.colorType === colorType);

  it("turns 32 records into 24 pools", () => {
    expect(REAL_STOCK).toHaveLength(32);
    expect(plan.pools).toHaveLength(24);
  });

  it("merges 222A-CEO into 222A with the quantities summed", () => {
    expect(find("222A", "Black")?.quantity).toBe(3);
    expect(find("222A", "Cyan")?.quantity).toBe(1);
    expect(find("222A", "Magenta")?.quantity).toBe(2);
    expect(find("222A", "Yellow")?.quantity).toBe(5);
  });

  it("merges CARTRIDGE 069 across Nester Square and the HR Manager Office", () => {
    for (const colour of ["Black", "Cyan", "Magenta", "Yellow"]) {
      expect(find("CARTRIDGE 069", colour)?.quantity).toBe(4);
      expect(find("CARTRIDGE 069", colour)?.sources).toHaveLength(2);
    }
  });

  it("leaves cartridges used by one printer alone", () => {
    expect(find("415A", "Black")?.sources).toHaveLength(1);
    expect(find("C-EXV54", "Yellow")?.quantity).toBe(5);
  });

  it("flags the stray Cyan filed against the two-colour PIXMA", () => {
    const flagged = plan.warnings.filter((w) => w.kind === "impossible-colour");

    expect(flagged).toHaveLength(1);
    expect(flagged[0].ref).toBe(poolKey("PIXMA 446", "Cyan"));
  });

  it("loses nothing: all 32 records land in a pool", () => {
    expect(plan.pools.flatMap((p) => p.sources)).toHaveLength(32);
  });

  it("preserves the total cartridge count", () => {
    const before = REAL_STOCK.reduce((n, r) => n + r.quantity, 0);
    const after = plan.pools.reduce((n, p) => n + p.quantity, 0);

    expect(after).toBe(before);
  });
});
```

Add the fixture import at the top of the test file:

```ts
import { REAL_STOCK } from "./migrationPlan.fixture";
```

- [ ] **Step 6: Run the whole suite and commit**

Run: `npx vitest run src/toners/migrationPlan.test.ts` — expect 21 tests passing.
Run: `npm test` — expect all green (182 existing + the new ones).

If the 24-pool or quantity assertions fail, **stop and report the actual numbers** rather than adjusting the expectation to match: the spec's figures were computed independently from the same export, so a disagreement means the planner is wrong.

```bash
git add src/toners/migrationPlan.ts src/toners/migrationPlan.test.ts src/toners/migrationPlan.fixture.ts
git commit -m "$(cat <<'EOF'
feat(toners): add pure migration planner for stock pooling

Folds per-printer records into cartridge pools, infers each printer's
cartridge, and reports what cannot be decided automatically.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: TonerStock type and service

**Files:**
- Modify: `src/types/toner.ts`
- Create: `src/services/tonerStockService.ts`

**Interfaces:**
- Consumes: `findPool` from `src/toners/pools.ts`; `tonerStatus`/`normaliseReorderLevel` from `src/toners/stockLevel.ts`; `getTonerReorderLevel` from `src/services/notificationService.ts`
- Produces:
  - `interface TonerStock` in `src/types/toner.ts`
  - `getTonerStock(): Promise<TonerStock[]>`
  - `addTonerStock(pool: Omit<TonerStock, "id">): Promise<string>`
  - `updateTonerStock(pool: TonerStock): Promise<void>`
  - `deleteTonerStock(id: string): Promise<void>`
  - `TONER_STOCK_COLLECTION = "toner_stock"`

- [ ] **Step 1: Add the type**

Append to `src/types/toner.ts`:

```ts
/**
 * One cartridge, one colour, one quantity.
 *
 * No location, room or printer model: every cartridge lives in the Travel House
 * store, and which printers draw on it is derived from `Printer.tonerType`. A
 * field that exists but is not matched on is how the old bugs stayed invisible.
 */
export interface TonerStock {
  id: string;
  tonerType: string;
  colorType: string;
  quantity: number;
  initialQuantity?: number;
  dateBrought: string;
  lastCheckedDate?: string;
  costPerUnit?: number;
  /** Derived on read, never trusted from storage. */
  status?: "Good" | "Warning" | "Critical";
}
```

- [ ] **Step 2: Write the service**

Create `src/services/tonerStockService.ts`:

```ts
// src/services/tonerStockService.ts
//
// Firestore access for the pooled toner stock.
//
// Thin on purpose: every decision worth testing lives in src/toners/, because
// Firestore cannot be reached from a test on this account.

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { TonerStock } from "../types/toner";
import { findPool } from "../toners/pools";
import { tonerStatus } from "../toners/stockLevel";
import { getTonerReorderLevel } from "./notificationService";

export const TONER_STOCK_COLLECTION = "toner_stock";

/** Every pool, with status derived on read as the old service did. */
export async function getTonerStock(): Promise<TonerStock[]> {
  const [snapshot, reorderLevel] = await Promise.all([
    getDocs(collection(db, TONER_STOCK_COLLECTION)),
    getTonerReorderLevel(),
  ]);

  return snapshot.docs.map((d) => {
    const data = d.data() as Omit<TonerStock, "id">;
    return {
      ...data,
      id: d.id,
      status: tonerStatus(Number(data.quantity) || 0, reorderLevel),
    };
  });
}

/**
 * Add a pool, refusing a second one for a cartridge and colour that already
 * has one — two pools for the same cartridge would split the count silently,
 * which is the class of bug this whole change exists to remove.
 */
export async function addTonerStock(pool: Omit<TonerStock, "id">): Promise<string> {
  const existing = await getTonerStock();
  if (findPool(existing, pool.tonerType, pool.colorType)) {
    throw new Error(
      `${pool.colorType} ${pool.tonerType} already has a stock record. Edit that one instead.`
    );
  }
  const ref = await addDoc(collection(db, TONER_STOCK_COLLECTION), pool);
  return ref.id;
}

export async function updateTonerStock(pool: TonerStock): Promise<void> {
  const { id, status: _status, ...data } = pool;
  await updateDoc(doc(db, TONER_STOCK_COLLECTION, id), data);
}

export async function deleteTonerStock(id: string): Promise<void> {
  await deleteDoc(doc(db, TONER_STOCK_COLLECTION, id));
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc -b --noEmit`
Expected: no output

Run: `npx eslint src/services/tonerStockService.ts src/types/toner.ts`
Expected: no output. If the unused `_status` destructure trips `no-unused-vars`, rename per the config's `argsIgnorePattern`/`varsIgnorePattern` rather than disabling the rule.

- [ ] **Step 4: Commit**

```bash
git add src/types/toner.ts src/services/tonerStockService.ts
git commit -m "$(cat <<'EOF'
feat(toners): add TonerStock type and toner_stock service

Refuses a duplicate pool for a cartridge and colour that already has one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Printers record their cartridge

**Files:**
- Modify: `src/types/printer.ts`
- Modify: `src/components/AddPrinterModal.tsx`

**Interfaces:**
- Consumes: `getAllTonerTypes`, `addTonerType` from `src/services/tonerService.ts`
- Produces: `Printer.tonerType?: string`

- [ ] **Step 1: Add the field**

In `src/types/printer.ts`, inside `interface Printer`, after `room`:

```ts
  /**
   * The cartridge this printer takes, e.g. "222A". Optional so existing
   * documents load; required by the Add/Edit Printer form from now on.
   * Replacement resolves stock by this plus a colour.
   */
  tonerType?: string;
```

- [ ] **Step 2: Add the form field**

In `src/components/AddPrinterModal.tsx`:

1. Import the toner types service alongside the existing imports:
   ```ts
   import { getAllTonerTypes } from "../services/tonerService";
   ```
2. Add state next to the existing `room` state (around line 29):
   ```ts
   const [tonerType, setTonerType] = useState(() => printer?.tonerType ?? "");
   const [tonerTypes, setTonerTypes] = useState<string[]>([]);
   ```
3. Load the options on mount:
   ```ts
   useEffect(() => {
     (async () => setTonerTypes(await getAllTonerTypes()))();
   }, []);
   ```
4. Include it in the saved object next to `room` (around line 124):
   ```ts
   tonerType: tonerType.trim() || undefined,
   ```
5. Render a required select immediately after the Room/Office block (which ends around line 227):
   ```tsx
   {/* Toner Type — what cartridge this printer takes */}
   <div>
     <label className="block text-sm font-medium mb-2">
       Toner Type <span className="text-red-500">*</span>
     </label>
     <select
       value={tonerType}
       onChange={(e) => setTonerType(e.target.value)}
       required
       className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
     >
       <option value="">Select the cartridge this printer takes</option>
       {tonerTypes.map((type) => (
         <option key={type} value={type}>
           {type}
         </option>
       ))}
     </select>
     <p className="text-xs text-gray-500 mt-1">
       Stock is shared by every printer taking the same cartridge.
     </p>
   </div>
   ```

- [ ] **Step 3: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/components/AddPrinterModal.tsx src/types/printer.ts`
Expected: no output

Run: `npm test`
Expected: all green

- [ ] **Step 4: Commit**

```bash
git add src/types/printer.ts src/components/AddPrinterModal.tsx
git commit -m "$(cat <<'EOF'
feat(printers): record which cartridge a printer takes

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Migration screen

**Files:**
- Create: `src/pages/TonerMigration.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/Settings.tsx`

**Interfaces:**
- Consumes: `planMigration`, `inferPrinterTonerType` (Task 2); `poolKey` (Task 1); `addTonerStock`, `getTonerStock` (Task 3); `getToners` from `src/services/tonerService.ts`; `getPrinters`, `updatePrinter` from `src/services/printerService.ts`
- Produces: route `/toners/migrate`

- [ ] **Step 1: Build the screen**

Create `src/pages/TonerMigration.tsx`. It renders four stages driven by one `stage` state (`"assign" | "merge" | "preview" | "done"`), calling `planMigration` on every render so the preview always reflects the current choices. Requirements:

- **Load once:** `getToners()`, `getPrinters()`, `getTonerStock()`. If `getTonerStock()` returns anything, show *"Migration has already run — {n} pools exist. Re-running would duplicate them."* and stop. This is the only guard against a double run.
- **Assign stage:** a row per printer showing location, room and model, with a cartridge `<select>` pre-filled from `plan.printerTypes[printer.id]`. Rows with no suggestion are highlighted. **Cannot advance while any printer is unassigned.**
- **Merge stage:** list the distinct cartridge names found in `oldStock`. Each row has an optional "same as" select naming another cartridge, which writes into the `aliases` object. Pre-select `222A-CEO → 222A` as a suggestion the user can clear.
- **Preview stage:** a table of `plan.pools` — cartridge, colour, quantity, and where merged, `sources.length` records with their old addresses. Merged rows visually marked. Every `plan.warnings` entry rendered; each `impossible-colour` warning gets a checkbox that adds its `ref` to `dropped`.
- **Never** write to or delete from `toners`.

The apply step, in full — note `sources` is stripped, because it is preview-only
and holds whole old records that must never reach Firestore:

```ts
async function apply() {
  setBusy(true);
  try {
    for (const p of plan.pools) {
      await addTonerStock({
        tonerType: p.tonerType,
        colorType: p.colorType,
        quantity: p.quantity,
        ...(p.initialQuantity === undefined ? {} : { initialQuantity: p.initialQuantity }),
        dateBrought: p.dateBrought,
      });
      setProgress((n) => n + 1);
    }

    for (const [printerId, tonerType] of Object.entries(assignments)) {
      const printer = printers.find((x) => x.id === printerId);
      if (printer) await updatePrinter({ ...printer, tonerType });
    }

    setStage("done");
  } catch (error) {
    // Stop where it failed. Pools already written stay written; re-running is
    // blocked by the guard, so recovery is manual and the user needs to know
    // exactly how far it got.
    setFailure(
      `Stopped after ${progress} of ${plan.pools.length} pools. ${(error as Error).message}. ` +
        `If this is a permissions error, the toner_stock collection needs a rule ` +
        `in the Firebase console before the migration can write.`
    );
  } finally {
    setBusy(false);
  }
}
```

`assignments` is the assign-stage state, seeded from `plan.printerTypes` and
edited by the user, so a printer the planner could not infer still gets written.

- [ ] **Step 2: Add the route**

In `src/App.tsx`, beside the existing toners routes:

```tsx
<Route path="toners/migrate" element={<TonerMigration />} />
```

- [ ] **Step 3: Add the Settings entry**

In `src/pages/Settings.tsx`, add a card linking to `/toners/migrate`, titled "Consolidate toner stock", with body text: *"Combine per-printer toner records into one shared set per cartridge. Preview before anything is saved."*

- [ ] **Step 4: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/pages/TonerMigration.tsx src/App.tsx src/pages/Settings.tsx`
Expected: no output

Run: `npm test && npm run build`
Expected: all green; build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/TonerMigration.tsx src/App.tsx src/pages/Settings.tsx
git commit -m "$(cat <<'EOF'
feat(toners): add migration screen for stock pooling

Four stages, nothing written until the last. Refuses to run twice.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: STOP — hand back to the user**

Tasks 6–11 switch the app to reading `toner_stock`. Until the migration has actually been run, doing so shows empty stock everywhere.

Tell the user: the migration screen is ready at Settings → Consolidate toner stock; run it, check the preview numbers, and confirm before implementation continues. Mention the Firebase console rules prerequisite for `toner_stock`.

---

### Task 6: Replacement resolves stock by cartridge

**Files:**
- Modify: `src/services/Tonerreplacementservice.ts`

**Interfaces:**
- Consumes: `findPool`, `normalizeType` (Task 1); `TONER_STOCK_COLLECTION` (Task 3)
- Produces: unchanged public signature — `replacePrinterToner(printer, color, replacement)`

- [ ] **Step 1: Rewrite the lookup**

Replace the `printerIdentity`/`tonerIdentity` filter block (currently the `wantedPrinter` const and the `matches` filter) with a resolution by cartridge. Read from `TONER_STOCK_COLLECTION`, not `TONERS_COLLECTION`. The `stockColor` PIXMA translation stays exactly as it is.

```ts
if (!printer.tonerType) {
  throw new TonerStockError("Set the toner type on this printer before replacing a cartridge.");
}

const stockSnapshot = await getDocs(collection(db, TONER_STOCK_COLLECTION));
const pools = stockSnapshot.docs.map((d) => ({
  id: d.id,
  ref: d.ref,
  ...(d.data() as { tonerType: string; colorType: string; quantity: number }),
}));

const pool = findPool(pools, printer.tonerType, stockColor);
if (!pool) {
  throw new TonerStockError(
    `No ${printer.tonerType} ${stockColor} in stock. Add it on the Toners page.`
  );
}

const stockRef = pool.ref;
```

The "more than one match" error is deleted — `addTonerStock` prevents duplicate pools at the source, and `findPool` returns the first regardless.

Everything from `runTransaction` onward is unchanged, except the replacement record's `colorType` stays `stockColor` and it gains `tonerType: printer.tonerType`. Leave `location`, `room` and `printerType` on the replacement record — that snapshot is history and the monthly report reads it.

- [ ] **Step 2: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/services/Tonerreplacementservice.ts`
Expected: no output

- [ ] **Step 3: Test in the app**

Start `npm run dev`. Replace a Magenta on a printer with stock; confirm the matching pool's quantity drops by one on the Toners page and a row appears in Replacement History. Then try a printer whose `tonerType` is unset and confirm the exact copy: *"Set the toner type on this printer before replacing a cartridge."*

- [ ] **Step 4: Commit**

```bash
git add src/services/Tonerreplacementservice.ts
git commit -m "$(cat <<'EOF'
feat(toners): resolve replacement stock by cartridge and colour

Location, room and model no longer take part in matching, so none of
them can break a replacement by being spelled two ways.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Toners page shows pools

**Files:**
- Modify: `src/pages/Toners.tsx`

**Interfaces:**
- Consumes: `getTonerStock`, `updateTonerStock`, `deleteTonerStock` (Task 3); `printersUsing` (Task 1); `getPrinters`; `lowToners` from `src/toners/stockLevel.ts`

- [ ] **Step 1: Replace grouping with pools**

- Swap `getToners()` for `getTonerStock()`; keep loading `getPrinters()`.
- Delete the `groupToners`/`selectedRecord` imports and usage. Rows are now one per cartridge: group `TonerStock[]` by `tonerType`, with the colour selector choosing among that cartridge's colours. Keep the existing `ColorSelectorBadge` and quantity-click-to-edit behaviour.
- Add a **Used by** column: `printersUsing(printers, tonerType).length` rendered as a chip reading `{n} printers` (`1 printer` when singular), which on click opens a `Swal` listing each printer as `{location}{room ? ` (${room})` : ""} — {model}`.
- Repoint the amber panel: instead of `unlinkedStock`, it now lists **printers with no `tonerType`** and **pools no printer uses**. Keep the same amber styling and the `Unlink` icon.
- `Export CSV` columns become `Cartridge, Colour, Quantity, Status, Used by, Date`.

- [ ] **Step 2: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/pages/Toners.tsx && npm test`
Expected: all clean. `grouping.test.ts` may now fail to typecheck if `Toners.tsx` was its only consumer — leave it; Task 11 deletes it.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Toners.tsx
git commit -m "$(cat <<'EOF'
feat(toners): show one row per cartridge with the printers that use it

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Add Toner form drops to three fields

**Files:**
- Modify: `src/components/AddTonerModal.tsx`

- [ ] **Step 1: Strip the form**

- Delete `TONER_PRINTER_MAP`, the `printers`/`selectablePrinterModels` usage, and the `location`, `room` and `printerType` state and fields entirely.
- What remains: **Toner Type** (existing select with its add-new button), **Color** (existing select), **Quantity**, plus the existing optional tracking block.
- `onSave` now emits `Omit<TonerStock, "id">`.
- Surface the duplicate-pool error from `addTonerStock` in a `Swal` rather than letting it throw unhandled.

- [ ] **Step 2: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/components/AddTonerModal.tsx && npm test`
Expected: all clean

- [ ] **Step 3: Commit**

```bash
git add src/components/AddTonerModal.tsx
git commit -m "$(cat <<'EOF'
feat(toners): reduce Add Toner to cartridge, colour and quantity

Removes the hardcoded TONER_PRINTER_MAP that made correct entry
impossible for the Tema Branch and COO's Office printers.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Consumables report reads pools

**Files:**
- Modify: `src/reports/consumables/model.ts`
- Modify: `src/reports/consumables/renderDocx.ts`
- Modify: `src/pages/ConsumablesReport.tsx`
- Test: `src/reports/consumables/model.test.ts`

**Interfaces:**
- Consumes: `TonerStock` (Task 3); `printersUsing` (Task 1)
- Produces: `buildConsumablesModel` now takes `TonerStock[]` plus `Printer[]`

- [ ] **Step 1: Write the failing test**

Add to `src/reports/consumables/model.test.ts`:

```ts
import type { TonerStock } from "../../types/toner";
import type { Printer } from "../../types/printer";

const pool = (over: Partial<TonerStock> & { id: string }): TonerStock =>
  ({
    tonerType: "222A",
    colorType: "Magenta",
    quantity: 2,
    initialQuantity: 4,
    dateBrought: "2026-02-13",
    status: "Critical",
    ...over,
  }) as TonerStock;

const printer = (id: string, tonerType: string): Printer =>
  ({
    id,
    location: "Travel House",
    model: "Color Laser Jet Pro MFP 3303fdw",
    tonerType,
    printerColorType: "black",
    quantity: 1,
    accessories: [],
    status: "Active",
    date: "2026-01-26",
  }) as Printer;

describe("buildConsumablesModel with pooled stock", () => {
  const printers = [printer("ceo", "222A"), printer("coo", "222A"), printer("tema", "222A")];

  it("names the cartridge and how many printers it feeds", () => {
    const model = buildConsumablesModel([pool({ id: "p" })], printers);

    expect(model.actions.map((a) => a.text)).toContain(
      "Reorder Magenta 222A — 2 left; used by 3 printers"
    );
  });

  it("says 1 printer, not 1 printers", () => {
    const model = buildConsumablesModel([pool({ id: "p", tonerType: "415A" })], [
      printer("ash", "415A"),
    ]);

    expect(model.actions.map((a) => a.text)).toContain(
      "Reorder Magenta 415A — 2 left; used by 1 printer"
    );
  });

  it("keeps the same colour of different cartridges apart", () => {
    const model = buildConsumablesModel(
      [pool({ id: "a", tonerType: "222A" }), pool({ id: "b", tonerType: "207A" })],
      printers
    );

    expect(model.toners).toHaveLength(2);
  });
});
```

Adjust `model.actions` / `model.toners` to whatever `buildConsumablesModel` actually returns — read the existing file first and match its shape rather than assuming these property names.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/reports/consumables/model.test.ts`
Expected: FAIL on the old wording

- [ ] **Step 3: Change the model**

- `model.ts:17` — key becomes `[item.tonerType, item.colorType].map(v => v?.trim().toLowerCase() ?? "").join("|")`.
- `model.ts:32` — `Reorder ${item.colorType} ${item.tonerType} — ${item.quantity} left; used by ${n} printers` where `n = printersUsing(printers, item.tonerType).length`. Use `1 printer` when `n === 1`.
- `model.ts:35` ("Soon") follows the same shape with `Prepare to reorder`.

- [ ] **Step 4: Change the docx table**

`renderDocx.ts:40` — columns become `["Cartridge", "Colour", "Left", "Status", "Used by"]`, where **Used by lists the offices in full**, comma-separated: `` `${p.location}${p.room ? ` (${p.room})` : ""}` ``.

- [ ] **Step 5: Verify and commit**

Run: `npm test && npx tsc -b --noEmit && npm run build`
Expected: all green

```bash
git add src/reports/consumables/ src/pages/ConsumablesReport.tsx
git commit -m "$(cat <<'EOF'
feat(reports): report consumables by cartridge rather than by office

Every cartridge lives in the Travel House store, so the location
columns said the same thing on every row. They are replaced by the
printers each cartridge feeds.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Toner Reports page

**Files:**
- Modify: `src/pages/TonerReports.tsx`

- [ ] **Step 1: Update the columns**

Swap `getToners()` for `getTonerStock()` and load `getPrinters()`. Replace the `printerType` column (lines ~107, ~343) with a **Used by** count, and keep `tonerType` as **Cartridge**. Update the CSV export columns to match.

- [ ] **Step 2: Verify and commit**

Run: `npx tsc -b --noEmit && npx eslint src/pages/TonerReports.tsx && npm test`

```bash
git add src/pages/TonerReports.tsx
git commit -m "$(cat <<'EOF'
feat(reports): show cartridges and the printers they feed

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Remove the superseded matching code

**Files:**
- Delete: `src/toners/grouping.ts`, `src/toners/grouping.test.ts`
- Modify: `src/toners/stockMatching.ts`, `src/toners/stockMatching.test.ts`

- [ ] **Step 1: Confirm nothing imports them**

Run: `grep -rn "from \"../toners/grouping\"\|from \"./grouping\"\|stockMatching" src/ --include=*.ts --include=*.tsx | grep -v "stockMatching.test"`
Expected: no hits outside `stockMatching.ts` itself. If anything remains, that task was left incomplete — fix it before deleting.

- [ ] **Step 2: Delete and shrink**

```bash
git rm src/toners/grouping.ts src/toners/grouping.test.ts
```

In `stockMatching.ts`, delete `printerIdentity`, `tonerIdentity`, `findPrinterForToner`, `unlinkedStock`, `candidatesFor` and `selectablePrinterModels` — pooling makes all of them unreachable. If nothing is left, delete the file and its test too.

Keep the C3326i and 3303 regression cases alive by confirming they are represented in `migrationPlan.test.ts` (the `222A-CEO → 222A` merge and the per-cartridge separation cover both). If they are not, add them there before deleting.

- [ ] **Step 3: Verify and commit**

Run: `npm test && npx tsc -b --noEmit && npx eslint src/ && npm run build`
Expected: all green

```bash
git add -A src/toners/
git commit -m "$(cat <<'EOF'
refactor(toners): drop per-printer matching now that stock is pooled

Location, room and model no longer identify stock, so the code that
compared them has no remaining caller.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## After the plan

Once Task 11 is done, two things remain outside this plan:

1. **The user recounts the cupboard** and corrects every pool quantity on the Toners page. The migration's sums are a starting position, not a target.
2. **Deleting the `toners` collection** — deliberately not done here. Leave it until the pools have been trusted for a while; it is the only rollback that exists.
