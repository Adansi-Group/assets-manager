import { describe, expect, it } from "vitest";
import {
  DEFAULT_TONER_REORDER_LEVEL,
  lowToners,
  normaliseReorderLevel,
  tonerStatus,
} from "./stockLevel";
import type { Toner } from "../types/toner";

const toner = (over: Partial<Toner> & { id: string }): Toner =>
  ({
    location: "Travel House",
    printerType: "HP LaserJet",
    tonerType: "415A",
    colorType: "Black",
    quantity: 10,
    dateBrought: "2026-01-01",
    ...over,
  }) as Toner;

describe("tonerStatus", () => {
  it("is critical at exactly the reorder level", () => {
    expect(tonerStatus(3, 3)).toBe("Critical");
  });

  it("is critical below the reorder level", () => {
    expect(tonerStatus(1, 3)).toBe("Critical");
  });

  it("is critical when there are none left", () => {
    expect(tonerStatus(0, 3)).toBe("Critical");
  });

  it("warns in the band just above the reorder level", () => {
    expect(tonerStatus(4, 3)).toBe("Warning");
    expect(tonerStatus(6, 3)).toBe("Warning");
  });

  it("is good well above the reorder level", () => {
    expect(tonerStatus(7, 3)).toBe("Good");
  });

  it("does not depend on how many were originally bought", () => {
    // The old percentage rule called 3-of-4 "Good" at 75%, which is the bug.
    expect(tonerStatus(3, 3)).toBe("Critical");
  });

  it("treats a level of zero as alert-only-when-empty", () => {
    expect(tonerStatus(1, 0)).toBe("Good");
    expect(tonerStatus(0, 0)).toBe("Critical");
  });

  it("never reports a negative quantity as healthy", () => {
    expect(tonerStatus(-2, 3)).toBe("Critical");
  });
});

describe("normaliseReorderLevel", () => {
  it("keeps a sensible configured level", () => {
    expect(normaliseReorderLevel(5)).toBe(5);
  });

  it("allows zero, meaning alert only when empty", () => {
    expect(normaliseReorderLevel(0)).toBe(0);
  });

  it("falls back to the default when unset", () => {
    expect(normaliseReorderLevel(undefined)).toBe(DEFAULT_TONER_REORDER_LEVEL);
    expect(normaliseReorderLevel(null)).toBe(DEFAULT_TONER_REORDER_LEVEL);
  });

  it("falls back to the default for nonsense", () => {
    expect(normaliseReorderLevel(Number.NaN)).toBe(DEFAULT_TONER_REORDER_LEVEL);
    expect(normaliseReorderLevel(-4)).toBe(DEFAULT_TONER_REORDER_LEVEL);
  });

  it("rounds a fractional level down, so 3.7 does not alert at 3", () => {
    expect(normaliseReorderLevel(3.7)).toBe(3);
  });
});

describe("lowToners", () => {
  it("returns only the toners at or below the level", () => {
    const found = lowToners(
      [
        toner({ id: "a", quantity: 10 }),
        toner({ id: "b", quantity: 3 }),
        toner({ id: "c", quantity: 0 }),
      ],
      3
    );

    expect(found.map(t => t.id)).toEqual(["c", "b"]);
  });

  it("puts the emptiest first, so the banner leads with the most urgent", () => {
    const found = lowToners(
      [toner({ id: "a", quantity: 2 }), toner({ id: "b", quantity: 0 }), toner({ id: "c", quantity: 1 })],
      3
    );

    expect(found.map(t => t.id)).toEqual(["b", "c", "a"]);
  });

  it("orders equal quantities by location so the list is stable", () => {
    const found = lowToners(
      [
        toner({ id: "a", quantity: 1, location: "Tema Branch" }),
        toner({ id: "b", quantity: 1, location: "Head Office" }),
      ],
      3
    );

    expect(found.map(t => t.id)).toEqual(["b", "a"]);
  });

  it("returns nothing when everything is well stocked", () => {
    expect(lowToners([toner({ id: "a", quantity: 20 })], 3)).toEqual([]);
  });
});
