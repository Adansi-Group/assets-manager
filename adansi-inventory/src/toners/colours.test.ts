import { describe, expect, it } from "vitest";
import { canonicalColour, optionsKeeping, TONER_COLOURS, withCanonicalColour } from "./colours";

describe("TONER_COLOURS", () => {
  it("is Black, Cyan, Magenta, Yellow and Color", () => {
    expect([...TONER_COLOURS]).toEqual(["Black", "Cyan", "Magenta", "Yellow", "Color"]);
  });

  it("has no PIXMA-suffixed entries", () => {
    expect(TONER_COLOURS.some((c) => /pixma/i.test(c))).toBe(false);
  });
});

describe("canonicalColour", () => {
  it.each([
    ["Black PIXMA", "Black"],
    ["Color PIXMA", "Color"],
    ["color pixma", "Color"],
    ["  BLACK   Pixma ", "Black"],
  ])("files %j as %j", (entered, stored) => {
    expect(canonicalColour(entered)).toBe(stored);
  });

  it("leaves every other colour exactly as given", () => {
    for (const colour of [...TONER_COLOURS, "Colour", "cyan", "Photo Black"]) {
      expect(canonicalColour(colour)).toBe(colour);
    }
  });
});

describe("withCanonicalColour", () => {
  it("rewrites only the colour", () => {
    const pool = { tonerType: "PIXMA 446", colorType: "Color PIXMA", quantity: 3 };
    expect(withCanonicalColour(pool)).toEqual({ tonerType: "PIXMA 446", colorType: "Color", quantity: 3 });
  });

  it("returns the same object when nothing changes", () => {
    const pool = { tonerType: "222A", colorType: "Magenta" };
    expect(withCanonicalColour(pool)).toBe(pool);
  });
});

describe("optionsKeeping", () => {
  it("adds an unusual saved value first so it is shown, not blanked", () => {
    expect(optionsKeeping(TONER_COLOURS, "Colour")).toEqual(["Colour", ...TONER_COLOURS]);
  });

  it("leaves the list alone when the saved value is one of the options, or empty", () => {
    expect(optionsKeeping(TONER_COLOURS, "Color")).toEqual([...TONER_COLOURS]);
    expect(optionsKeeping(TONER_COLOURS, "")).toEqual([...TONER_COLOURS]);
  });
});
