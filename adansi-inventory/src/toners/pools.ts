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
