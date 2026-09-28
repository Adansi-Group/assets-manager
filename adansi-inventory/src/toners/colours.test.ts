import { describe, expect, it } from "vitest";
import {
  canonicalColour,
  colourChoices,
  coloursFor,
  optionsKeeping,
  TONER_COLOURS,
  withCanonicalColour,
} from "./colours";

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

describe("coloursFor", () => {
  it("offers the four toner colours for an ordinary cartridge, and no Color", () => {
    expect(coloursFor("CARTRIDGE 069")).toEqual(["Black", "Cyan", "Magenta", "Yellow"]);
    expect(coloursFor("415A")).toEqual(["Black", "Cyan", "Magenta", "Yellow"]);
  });

  it("offers only Black and Color for a PIXMA, however it is written", () => {
    expect(coloursFor("PIXMA 446")).toEqual(["Black", "Color"]);
    expect(coloursFor("  pixma   446 ")).toEqual(["Black", "Color"]);
    expect(coloursFor("Canon Pixma TS3440")).toEqual(["Black", "Color"]);
  });

  it("offers the four toner colours before a cartridge is chosen", () => {
    expect(coloursFor("")).toEqual(["Black", "Cyan", "Magenta", "Yellow"]);
  });
});

describe("colourChoices", () => {
  it("is just the cartridge's own colours when nothing unusual is in stock", () => {
    expect(colourChoices("CARTRIDGE 069", ["Black", "Cyan", "Magenta", "Yellow"])).toEqual([
      "Black",
      "Cyan",
      "Magenta",
      "Yellow",
    ]);
    expect(colourChoices("PIXMA 446", [])).toEqual(["Black", "Color"]);
  });

  it("never hides stock that exists under a colour the cartridge should not have", () => {
    expect(colourChoices("PIXMA 446", ["Color", "Cyan"])).toEqual(["Black", "Color", "Cyan"]);
    expect(colourChoices("415A", ["Color"])).toEqual(["Black", "Cyan", "Magenta", "Yellow", "Color"]);
  });

  it("does not list one colour twice under two spellings", () => {
    expect(colourChoices("415A", ["black", " Cyan "])).toEqual(["Black", "Cyan", "Magenta", "Yellow"]);
  });
});
