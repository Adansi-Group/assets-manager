import { describe, expect, it } from "vitest";
import { article, verbHave, verbS, verbWas } from "./text";

describe("verbHave", () => {
  it("agrees with a singular subject", () => {
    expect(verbHave(1)).toBe("has");
  });

  it("agrees with a plural subject", () => {
    expect(verbHave(2)).toBe("have");
  });

  it("treats none as plural, as English does", () => {
    expect(verbHave(0)).toBe("have");
  });
});

describe("verbS", () => {
  it("adds the third-person s for a singular subject", () => {
    expect(verbS(1, "hold")).toBe("holds");
  });

  it("leaves the bare verb for a plural subject", () => {
    expect(verbS(2, "hold")).toBe("hold");
  });

  it("uses -es where the bare verb needs it", () => {
    expect(verbS(1, "carry")).toBe("carries");
    expect(verbS(2, "carry")).toBe("carry");
  });
});

describe("verbWas", () => {
  it("agrees with a singular subject", () => {
    expect(verbWas(1)).toBe("was");
  });

  it("agrees with a plural subject", () => {
    expect(verbWas(2)).toBe("were");
  });
});

describe("article", () => {
  it("uses 'a' before a consonant", () => {
    expect(article("MacBook Air")).toBe("a");
  });

  it("uses 'an' before a vowel", () => {
    expect(article("EliteBook")).toBe("an");
  });

  it("uses 'an' before an acronym whose first letter is read as a vowel", () => {
    // "an aitch-pee", not "a HP".
    expect(article("HP EliteBook")).toBe("an");
    expect(article("MSI Modern")).toBe("an");
  });

  it("uses 'a' before an acronym whose first letter is read as a consonant", () => {
    expect(article("HP")).toBe("an");
    expect(article("Dell Latitude")).toBe("a");
    expect(article("TP-Link")).toBe("a");
  });
});
