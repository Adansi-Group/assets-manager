import { describe, expect, it } from "vitest";
import {
  ACCESS_COPY,
  decideAccess,
  memberChangeProblem,
  memberEntryProblem,
  normalizeEmail,
  refusalMessage,
  type SignIn,
} from "./members";
import type { Member } from "../types/member";

const google: SignIn = { emailVerified: true, provider: "google.com" };
const password: SignIn = { emailVerified: false, provider: "password" };

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
    expect(decideAccess("eobeng@adansitravels.com", { status: "found", member: m }, google)).toEqual({
      allowed: true,
      member: m,
    });
  });
  it("refuses a signed-in person with no email", () => {
    expect(decideAccess("", { status: "missing" }, google)).toEqual({ allowed: false, reason: "no-email" });
    expect(decideAccess(null, { status: "missing" }, google)).toEqual({ allowed: false, reason: "no-email" });
  });
  it("refuses a non-member", () => {
    expect(decideAccess("stranger@gmail.com", { status: "missing" }, google)).toEqual({
      allowed: false,
      reason: "not-member",
    });
  });
  it("refuses when the lookup failed, never defaulting to a role", () => {
    expect(decideAccess("eobeng@adansitravels.com", { status: "failed" }, google)).toEqual({
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
        google
      )
    ).toEqual({ allowed: false, reason: "not-member" });
  });
  it("matches regardless of case in the token", () => {
    const m = member("mannan@adansitravels.com");
    expect(decideAccess("Mannan@AdansiTravels.com", { status: "found", member: m }, google).allowed).toBe(
      true
    );
  });
  it("refuses a listed email whose sign-in nobody verified", () => {
    // Anyone can register a password account for an email they do not own.
    const m = member("mannan@adansitravels.com");
    expect(decideAccess("mannan@adansitravels.com", { status: "found", member: m }, password)).toEqual({
      allowed: false,
      reason: "unverified",
    });
  });
  it("lets an unverified password sign-in in when the member entry allows it", () => {
    const hr: Member = { ...member("hr@adansitravels.com", "HR Manager"), passwordSignIn: true };
    expect(decideAccess("hr@adansitravels.com", { status: "found", member: hr }, password)).toEqual({
      allowed: true,
      member: hr,
    });
  });
  it("refuses a password session for a listed email even once the email is verified", () => {
    // Someone registers a password account for mannan@ before he first signs
    // in; his Google sign-in later verifies that same account. Their old
    // session must still get nothing.
    const m = member("mannan@adansitravels.com");
    expect(
      decideAccess(
        "mannan@adansitravels.com",
        { status: "found", member: m },
        { emailVerified: true, provider: "password" }
      )
    ).toEqual({ allowed: false, reason: "unverified" });
  });
  it("refuses any provider it was not told to trust", () => {
    const m = member("mannan@adansitravels.com");
    expect(
      decideAccess(
        "mannan@adansitravels.com",
        { status: "found", member: m },
        { emailVerified: true, provider: "facebook.com" }
      )
    ).toEqual({ allowed: false, reason: "unverified" });
  });
  it("refuses when it could not read how the person signed in", () => {
    const m = member("eobeng@adansitravels.com");
    expect(decideAccess("eobeng@adansitravels.com", { status: "found", member: m }, null)).toEqual({
      allowed: false,
      reason: "lookup-failed",
    });
  });
  it("lets a password member in with Google too", () => {
    const hr: Member = { ...member("hr@adansitravels.com", "HR Manager"), passwordSignIn: true };
    expect(decideAccess("hr@adansitravels.com", { status: "found", member: hr }, google).allowed).toBe(true);
  });
  it("refuses a member whose role is not one the app knows", () => {
    // Typed by hand in the console as "admin": every permission check would throw.
    const m = { ...member("eobeng@adansitravels.com"), role: "admin" } as unknown as Member;
    expect(decideAccess("eobeng@adansitravels.com", { status: "found", member: m }, google)).toEqual({
      allowed: false,
      reason: "bad-entry",
    });
  });
  it("does not tell an untrusted sign-in that the entry has a mistake", () => {
    const m = { ...member("eobeng@adansitravels.com"), role: "admin" } as unknown as Member;
    expect(decideAccess("eobeng@adansitravels.com", { status: "found", member: m }, password)).toEqual({
      allowed: false,
      reason: "unverified",
    });
  });
  it("takes only a real true as the password exception", () => {
    // The first entries are typed by hand in the console; "true" as text is not a yes.
    const hr = { ...member("hr@adansitravels.com", "HR Manager"), passwordSignIn: "true" } as unknown as Member;
    expect(decideAccess("hr@adansitravels.com", { status: "found", member: hr }, password)).toEqual({
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
  it("tells a listed person with a broken entry who can fix it", () => {
    expect(refusalMessage("bad-entry")).toBe(
      "Your entry on the members list has a mistake. Ask an administrator to check it."
    );
  });
});

describe("memberEntryProblem", () => {
  const entry = { name: "Mannan", role: "Admin" };
  it("finds nothing wrong with a good entry", () => {
    expect(memberEntryProblem("mannan@adansitravels.com", entry)).toBeNull();
  });
  it("flags an id that is not the lower-cased email", () => {
    expect(memberEntryProblem("Mannan@AdansiTravels.com", entry)).toMatch(/lower case/i);
    expect(memberEntryProblem("mannan@adansitravels.com ", entry)).toMatch(/lower case/i);
  });
  it("flags a role the app does not know", () => {
    expect(memberEntryProblem("mannan@adansitravels.com", { ...entry, role: "admin" })).toMatch(
      /"admin" is not a role/
    );
    expect(memberEntryProblem("mannan@adansitravels.com", { name: "Mannan" })).toMatch(/role/i);
  });
  it("flags a missing name", () => {
    expect(memberEntryProblem("mannan@adansitravels.com", { role: "Admin" })).toMatch(/name/i);
    expect(memberEntryProblem("mannan@adansitravels.com", { name: "  ", role: "Admin" })).toMatch(/name/i);
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
