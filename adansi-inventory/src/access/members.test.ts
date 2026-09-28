import { describe, expect, it } from "vitest";
import {
  ACCESS_COPY,
  decideAccess,
  memberChangeProblem,
  normalizeEmail,
  refusalMessage,
} from "./members";
import type { Member } from "../types/member";

const member = (email: string, role: Member["role"] = "Admin"): Member => ({
  email,
  name: "Someone",
  role,
  createdAt: "2026-09-28T00:00:00.000Z",
});

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Mannan@AdansiTravels.com ")).toBe("mannan@adansitravels.com");
  });
  it("turns missing or blank into an empty string", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("decideAccess", () => {
  it("lets a member in", () => {
    const m = member("eobeng@adansitravels.com");
    expect(decideAccess("eobeng@adansitravels.com", { status: "found", member: m }, true)).toEqual({
      allowed: true,
      member: m,
    });
  });
  it("refuses a signed-in person with no email", () => {
    expect(decideAccess("", { status: "missing" }, true)).toEqual({ allowed: false, reason: "no-email" });
    expect(decideAccess(null, { status: "missing" }, true)).toEqual({ allowed: false, reason: "no-email" });
  });
  it("refuses a non-member", () => {
    expect(decideAccess("stranger@gmail.com", { status: "missing" }, true)).toEqual({
      allowed: false,
      reason: "not-member",
    });
  });
  it("refuses when the lookup failed, never defaulting to a role", () => {
    expect(decideAccess("eobeng@adansitravels.com", { status: "failed" }, true)).toEqual({
      allowed: false,
      reason: "lookup-failed",
    });
  });
  it("refuses a found document whose email does not match the token", () => {
    // Defence in depth: the caller looked up the wrong id.
    expect(
      decideAccess(
        "eobeng@adansitravels.com",
        { status: "found", member: member("hr@adansitravels.com") },
        true
      )
    ).toEqual({ allowed: false, reason: "not-member" });
  });
  it("matches regardless of case in the token", () => {
    const m = member("mannan@adansitravels.com");
    expect(decideAccess("Mannan@AdansiTravels.com", { status: "found", member: m }, true).allowed).toBe(
      true
    );
  });
  it("refuses a listed email whose sign-in nobody verified", () => {
    // Anyone can register a password account for an email they do not own.
    const m = member("mannan@adansitravels.com");
    expect(decideAccess("mannan@adansitravels.com", { status: "found", member: m }, false)).toEqual({
      allowed: false,
      reason: "unverified",
    });
  });
  it("lets an unverified password sign-in in when the member entry allows it", () => {
    const hr: Member = { ...member("hr@adansitravels.com", "HR Manager"), passwordSignIn: true };
    expect(decideAccess("hr@adansitravels.com", { status: "found", member: hr }, false)).toEqual({
      allowed: true,
      member: hr,
    });
  });
  it("takes only a real true as the password exception", () => {
    // The first entries are typed by hand in the console; "true" as text is not a yes.
    const hr = { ...member("hr@adansitravels.com", "HR Manager"), passwordSignIn: "true" } as unknown as Member;
    expect(decideAccess("hr@adansitravels.com", { status: "found", member: hr }, false)).toEqual({
      allowed: false,
      reason: "unverified",
    });
  });
});

describe("refusalMessage", () => {
  it("uses the exact copy", () => {
    expect(ACCESS_COPY.notMember).toBe(
      "You don't have access to Assets Station. Ask an administrator to add you."
    );
    expect(ACCESS_COPY.lookupFailed).toBe("Couldn't check your access. Please try again.");
    expect(refusalMessage("not-member")).toBe(ACCESS_COPY.notMember);
    expect(refusalMessage("no-email")).toBe(ACCESS_COPY.notMember);
    expect(refusalMessage("unverified")).toBe(ACCESS_COPY.notMember);
    expect(refusalMessage("lookup-failed")).toBe(ACCESS_COPY.lookupFailed);
  });
});

describe("memberChangeProblem", () => {
  const me = member("eobeng@adansitravels.com", "Admin");
  it("refuses removing yourself", () => {
    expect(memberChangeProblem("eobeng@adansitravels.com", me, { kind: "remove" })).toMatch(/yourself/i);
  });
  it("refuses changing your own role", () => {
    expect(
      memberChangeProblem("EOBENG@adansitravels.com", me, { kind: "edit", role: "Viewer" })
    ).toMatch(/your own role/i);
  });
  it("allows editing your own details without changing role", () => {
    expect(memberChangeProblem("eobeng@adansitravels.com", me, { kind: "edit", role: "Admin" })).toBeNull();
  });
  it("allows removing or re-roling someone else", () => {
    const hr = member("hr@adansitravels.com", "HR Manager");
    expect(memberChangeProblem("eobeng@adansitravels.com", hr, { kind: "remove" })).toBeNull();
    expect(memberChangeProblem("eobeng@adansitravels.com", hr, { kind: "edit", role: "Viewer" })).toBeNull();
  });
});
