import { describe, expect, it } from "vitest";
import { correctionHint, RAISED_COUNT_HINT } from "./corrections";

describe("correctionHint", () => {
  it("reminds about Add stock when a correction raises the count", () => {
    expect(correctionHint(3, 5)).toBe(RAISED_COUNT_HINT);
    expect(RAISED_COUNT_HINT).toMatch(/use Add stock instead so the monthly report counts them/);
  });

  it("says nothing when the count goes down or stays the same", () => {
    expect(correctionHint(5, 3)).toBeNull();
    expect(correctionHint(4, 4)).toBeNull();
  });

  it("says nothing when the previous count is unreadable", () => {
    expect(correctionHint(undefined, 4)).toBeNull();
    expect(correctionHint("abc", 4)).toBeNull();
  });
});
