import { describe, expect, it } from "vitest";
import { inferPrinterTonerType, planMigration } from "./migrationPlan";
import { poolKey } from "./pools";
import { REAL_STOCK } from "./migrationPlan.fixture";
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
