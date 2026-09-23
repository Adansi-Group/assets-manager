// src/reports/shared/text.ts
//
// Small pure helpers for generating readable report prose.

/** "1 device" / "2 devices". Pass `plural` for irregular words. */
export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : plural ?? `${singular}s`;
}

/** "is" / "are", matching `n`. */
export function verbBe(n: number): string {
  return n === 1 ? "is" : "are";
}

/** "has" / "have", matching `n`. */
export function verbHave(n: number): string {
  return n === 1 ? "has" : "have";
}

/**
 * A regular verb agreeing with `n`: verbS(1, "hold") -> "holds".
 *
 * Report prose counts things constantly, and a count of 1 needs the verb to
 * agree — "1 person hold a laptop" is the giveaway that a sentence was built
 * from a template.
 */
export function verbS(n: number, base: string): string {
  if (n !== 1) return base;
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ies`;
  if (/(s|sh|ch|x|z|o)$/.test(base)) return `${base}es`;
  return `${base}s`;
}

/** "a", "a and b", "a, b and c" — Oxford comma omitted to match house style. */
export function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Join a long list, capping how many names are spelled out.
 * "a, b and 3 others" — keeps a 200-person estate from swallowing the page.
 */
export function joinListCapped(items: string[], max: number): string {
  if (items.length <= max) return joinList(items);
  const shown = items.slice(0, max);
  const rest = items.length - max;
  return `${shown.join(", ")} and ${rest} ${pluralize(rest, "other")}`;
}

/** Whole-number percent of total. Returns 0 when total is 0 rather than NaN. */
export function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** "42%" — safe when total is 0. */
export function pctLabel(part: number, total: number): string {
  return `${pct(part, total)}%`;
}

/** Sentence-case a value for prose without touching acronyms mid-string. */
export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/** "was" / "were", matching `n`. */
export function verbWas(n: number): string {
  return n === 1 ? "was" : "were";
}

/**
 * Letters whose spoken name starts with a vowel sound, so an acronym beginning
 * with one takes "an": an HP (aitch), an MSI (em), an SSD (ess).
 */
const VOWEL_SOUNDING_LETTERS = new Set(["A", "E", "F", "H", "I", "L", "M", "N", "O", "R", "S", "X"]);

/**
 * "a" or "an" for `phrase`, by how its first word is spoken.
 *
 * Device models are full of acronyms, where the article follows the letter's
 * name rather than its spelling — "a HP EliteBook" is the giveaway that a
 * sentence was assembled rather than written.
 */
export function article(phrase: string): string {
  const first = phrase.trim().split(/[\s-]+/)[0] ?? "";
  if (first.length === 0) return "a";

  // Two or more capitals with no lowercase reads as an acronym, spoken letter
  // by letter; anything else is read as a word.
  const isAcronym = first.length > 1 && first === first.toUpperCase() && /^[A-Z]+$/.test(first);
  if (isAcronym) return VOWEL_SOUNDING_LETTERS.has(first[0]) ? "an" : "a";

  return /^[aeiou]/i.test(first) ? "an" : "a";
}
