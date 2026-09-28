//
// Who may use Assets Station. Pure: no React, no Firestore.
//
// The access list is the `members` collection, keyed by email. Anyone not on
// it is refused — there is no default role, and a failed lookup refuses too.
//
// Being listed is not enough: anyone can register a password account for an
// email they do not own. So the sign-in must be a Google one with a verified
// email, unless the member entry says a password is expected. The provider is
// checked as well as the email because a password session opened before the
// real owner's first Google sign-in would otherwise become verified with it.

import type { Member } from "../types/member";
import { isUserRole, type UserRole } from "../types/users";

export const ACCESS_COPY = {
  notMember: "You don't have access to Assets Station. Ask an administrator to add you.",
  lookupFailed: "Couldn't check your access. Please try again.",
  badEntry: "Your entry on the members list has a mistake. Ask an administrator to check it.",
} as const;

/** How the person signed in, read from the same token the Firestore rules see. */
export interface SignIn {
  emailVerified: boolean;
  /** e.g. "google.com" or "password". */
  provider: string | null;
}

/** Emails compare the way a person reads them: case and surrounding spaces are noise. */
export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export type MemberLookup =
  | { status: "found"; member: Member }
  | { status: "missing" }
  | { status: "failed" };

export type RefusalReason = "no-email" | "not-member" | "unverified" | "bad-entry" | "lookup-failed";

export type AccessDecision =
  | { allowed: true; member: Member }
  | { allowed: false; reason: RefusalReason };

export function decideAccess(
  tokenEmail: string | null | undefined,
  lookup: MemberLookup,
  /** Null when the token could not be read. */
  signIn: SignIn | null
): AccessDecision {
  const email = normalizeEmail(tokenEmail);
  if (!email) return { allowed: false, reason: "no-email" };
  if (lookup.status === "failed" || !signIn) return { allowed: false, reason: "lookup-failed" };
  if (lookup.status === "missing") return { allowed: false, reason: "not-member" };
  if (normalizeEmail(lookup.member.email) !== email) return { allowed: false, reason: "not-member" };
  const trusted =
    (signIn.provider === "google.com" && signIn.emailVerified) ||
    (signIn.provider === "password" && lookup.member.passwordSignIn === true);
  if (!trusted) return { allowed: false, reason: "unverified" };
  // Only someone we trust is told their entry is broken.
  if (!isUserRole(lookup.member.role)) return { allowed: false, reason: "bad-entry" };
  return { allowed: true, member: lookup.member };
}

export function refusalMessage(reason: RefusalReason): string {
  if (reason === "lookup-failed") return ACCESS_COPY.lookupFailed;
  if (reason === "bad-entry") return ACCESS_COPY.badEntry;
  return ACCESS_COPY.notMember;
}

/**
 * What is wrong with a members entry as stored, or null. The first entries
 * are typed by hand in the console, where nothing checks them.
 */
export function memberEntryProblem(
  id: string,
  entry: { name?: unknown; role?: unknown }
): string | null {
  if (id !== normalizeEmail(id)) {
    return "The id of this entry is not the email in lower case, so this person can't sign in. Remove it and add them again.";
  }
  if (!isUserRole(entry.role)) {
    const shown = typeof entry.role === "string" && entry.role ? `"${entry.role}" is not a role` : "No role";
    return `${shown}, so this person can't sign in. Edit them and pick a role.`;
  }
  if (typeof entry.name !== "string" || !entry.name.trim()) {
    return "No name. Edit this person and add one.";
  }
  return null;
}

/**
 * Why an admin may not make this change, or null if they may. An admin can
 * neither remove themselves nor change their own role, so the last admin can
 * never lock everyone out by accident.
 */
export function memberChangeProblem(
  actingEmail: string,
  target: Member,
  change: { kind: "remove" } | { kind: "edit"; role: UserRole }
): string | null {
  const self = normalizeEmail(actingEmail) === normalizeEmail(target.email);
  if (!self) return null;
  if (change.kind === "remove") return "You can't remove yourself. Ask another admin to do it.";
  if (change.role !== target.role) return "You can't change your own role. Ask another admin to do it.";
  return null;
}
