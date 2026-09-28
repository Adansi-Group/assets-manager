// src/toners/colours.ts
//
// The colours a toner pool can be filed under — one list, used by every
// screen that writes stock.
//
// A PIXMA takes one Black and one combined Color cartridge, so its pools are
// "Black" and "Color", the same words the replacement looks up. The forms used
// to offer "Black PIXMA" and "Color PIXMA" instead, which opened a second pool
// the replacement could never draw from. Those two legacy spellings are mapped
// back onto the real colours before anything is written.
//
// Pure: no React, no Firestore.

import { normalizeType } from "./pools";

/** Every colour a pool can have. PIXMA pools use Black and Color. */
export const TONER_COLOURS = ["Black", "Cyan", "Magenta", "Yellow", "Color"] as const;

const LEGACY_COLOURS: Record<string, string> = {
  "black pixma": "Black",
  "color pixma": "Color",
};

/**
 * The colour to store for what was entered: "Black PIXMA" and "Color PIXMA"
 * (any casing or spacing) become Black and Color; anything else is returned
 * as given.
 */
export function canonicalColour(colour: string): string {
  return LEGACY_COLOURS[normalizeType(colour)] ?? colour;
}

/** A stock write with its colour made canonical. Other fields untouched. */
export function withCanonicalColour<T extends { colorType: string }>(input: T): T {
  const colorType = canonicalColour(input.colorType);
  return colorType === input.colorType ? input : { ...input, colorType };
}

/**
 * Select options that keep a saved value visible: the list, plus the saved
 * value first when it is not exactly one of the options — so an unusual
 * saved value is shown and saved unchanged rather than blanked.
 */
export function optionsKeeping(options: readonly string[], saved: string): string[] {
  return saved && !options.includes(saved) ? [saved, ...options] : [...options];
}
