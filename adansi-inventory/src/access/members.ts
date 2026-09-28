//
// Who may use Assets Station. Pure: no React, no Firestore.
//
// The access list is the `members` collection, keyed by email. Anyone not on
// it is refused — there is no default role, and a failed lookup refuses too.

import type { Member } from "../types/member";
import type { UserRole } from "../types/users";

export const ACCESS_COPY = {
  notMember: "You don't have access to Assets Station. Ask an administrator to add you.",
  lookupFailed: "Couldn't check your access. Please try again.",
} as const;

/** Emails compare the way a person reads them: case and surrounding spaces are noise. */
export function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export type MemberLookup =
  | { status: "found"; member: Member }
  | { status: "missing" }
  | { status: "failed" };

export type RefusalReason = "no-email" | "not-member" | "lookup-failed";

export type AccessDecision =
  | { allowed: true; member: Member }
  | { allowed: false; reason: RefusalReason };

export function decideAccess(
  tokenEmail: string | null | undefined,
  lookup: MemberLookup
): AccessDecision {
  const email = normalizeEmail(tokenEmail);
  if (!email) return { allowed: false, reason: "no-email" };
  if (lookup.status === "failed") return { allowed: false, reason: "lookup-failed" };
  if (lookup.status === "missing") return { allowed: false, reason: "not-member" };
  if (normalizeEmail(lookup.member.email) !== email) return { allowed: false, reason: "not-member" };
  return { allowed: true, member: lookup.member };
}

export function refusalMessage(reason: RefusalReason): string {
  return reason === "lookup-failed" ? ACCESS_COPY.lookupFailed : ACCESS_COPY.notMember;
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
