import { describe, expect, it } from "vitest";
import { findPoolCollisions, groupPools, selectedPool, usedByLabel } from "./poolRows";
import type { TonerStock } from "../types/toner";
import type { Printer } from "../types/printer";

const pool = (over: Partial<TonerStock> & { id: string }): TonerStock =>
  ({
    tonerType: "222A",
    colorType: "Black",
    quantity: 5,
    dateBrought: "2026-01-01",
    ...over,
  }) as TonerStock;

const printer = (over: Partial<Printer> & { id: string }): Printer =>
  ({
    location: "Travel House",
    model: "HP Color LaserJet Pro MFP M283fdw",
    printerColorType: "white",
    quantity: 1,
    accessories: [],
    status: "Active",
    date: "2026-01-01",
    tonerType: "222A",
    ...over,
  }) as Printer;

describe("groupPools", () => {
  it("puts every colour of one cartridge in a single row", () => {
    const rows = groupPools(
      [
        pool({ id: "blk", colorType: "Black" }),
        pool({ id: "cya", colorType: "Cyan" }),
        pool({ id: "mag", colorType: "Magenta" }),
      ],
      [],
      {}
    );

    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0].colors)).toHaveLength(3);
  });

  it("keeps two cartridge types apart", () => {
    const rows = groupPools(
      [pool({ id: "a", tonerType: "222A" }), pool({ id: "b", tonerType: "415A" })],
      [],
      {}
    );

    expect(rows).toHaveLength(2);
  });

  it("rolls a row's status up to the worst colour it holds", () => {
    const rows = groupPools(
      [
        pool({ id: "blk", colorType: "Black", status: "Good" }),
        pool({ id: "cya", colorType: "Cyan", status: "Critical" }),
        pool({ id: "mag", colorType: "Magenta", status: "Warning" }),
      ],
      [],
      {}
    );

    expect(rows[0].status).toBe("Critical");
  });

  it("normalizes colour keys so casing and spacing do not create two colours", () => {
    const rows = groupPools(
      [pool({ id: "a", colorType: "Black" }), pool({ id: "b", colorType: "  black " })],
      [],
      {}
    );

    // Both pools land in the same colour slot rather than showing as two
    // separate colours on the row.
    expect(Object.keys(rows[0].colors)).toEqual(["black"]);
  });

  it("leaves a cartridge's missing colours absent rather than inventing them", () => {
    const rows = groupPools([pool({ id: "blk", colorType: "Black" })], [], {});

    expect(Object.keys(rows[0].colors)).toEqual(["black"]);
  });

  it("counts only the printers that take this exact cartridge", () => {
    const rows = groupPools(
      [pool({ id: "a", tonerType: "222A" })],
      [printer({ id: "p1", tonerType: "222A" }), printer({ id: "p2", tonerType: "415A" })],
      {}
    );

    expect(rows[0].usedBy).toHaveLength(1);
  });

  it("counts zero printers when none use the cartridge", () => {
    const rows = groupPools([pool({ id: "a", tonerType: "222A" })], [], {});

    expect(rows[0].usedBy).toHaveLength(0);
  });
});

describe("selectedPool", () => {
  it("finds the pool for the selected colour regardless of its casing", () => {
    const rows = groupPools([pool({ id: "blk", colorType: "Black" })], [], {
      "222a": "BLACK",
    });

    expect(selectedPool(rows[0])?.id).toBe("blk");
  });

  it("is undefined when the selected colour has no pool yet", () => {
    const rows = groupPools([pool({ id: "blk", colorType: "Black" })], [], {
      "222a": "Cyan",
    });

    expect(selectedPool(rows[0])).toBeUndefined();
  });
});

describe("findPoolCollisions", () => {
  it("reports two pools that normalize to the same cartridge and colour", () => {
    const collisions = findPoolCollisions([
      pool({ id: "a", colorType: "Black" }),
      pool({ id: "b", colorType: "  black " }),
      pool({ id: "c", colorType: "Cyan" }),
    ]);

    expect(collisions).toHaveLength(1);
    expect(collisions[0].map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("reports nothing when every pool is a distinct cartridge and colour", () => {
    expect(
      findPoolCollisions([pool({ id: "a", colorType: "Black" }), pool({ id: "b", colorType: "Cyan" })])
    ).toEqual([]);
  });
});

describe("usedByLabel", () => {
  it("says 0 printers", () => {
    expect(usedByLabel(0)).toBe("0 printers");
  });

  it("says 1 printer, singular", () => {
    expect(usedByLabel(1)).toBe("1 printer");
  });

  it("says N printers, plural", () => {
    expect(usedByLabel(3)).toBe("3 printers");
  });
});
