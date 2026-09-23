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

  it("cannot collide when a cartridge name contains the separator", () => {
    expect(poolKey("A|B", "C")).not.toBe(poolKey("A", "B|C"));
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
