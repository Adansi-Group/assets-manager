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

const FOUR_COLOURS = ["Black", "Cyan", "Magenta", "Yellow"] as const;
const PIXMA_COLOURS = ["Black", "Color"] as const;

/**
 * The colours this cartridge comes in. A PIXMA takes one Black and one
 * combined Color cartridge; everything else comes in the four toner colours
 * and has no "Color".
 */
export function coloursFor(tonerType: string): readonly string[] {
  return normalizeType(tonerType).includes("pixma") ? PIXMA_COLOURS : FOUR_COLOURS;
}

/**
 * The colours to offer for this cartridge: its own, then any colour it
 * holds stock under — so cartridges filed under a colour it should not have
 * stay reachable instead of vanishing from the screen. Callers pass only
 * the colours of pools that are not empty.
 */
export function colourChoices(tonerType: string, inStock: readonly string[]): string[] {
  const seen = new Set<string>();
  const choices: string[] = [];
  for (const colour of [...coloursFor(tonerType), ...inStock]) {
    const key = normalizeType(colour);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    choices.push(colour.trim());
  }
  return choices;
}

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
