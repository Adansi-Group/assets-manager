// src/toners/accessErrors.ts
//
// What to tell a person when Firestore refuses a read or write.
//
// Firestore's own text, "Missing or insufficient permissions", names neither
// the collection nor the fix. The rules check membership and role, so the
// likeliest cause is a role that may not do this — name the collection and
// say who to ask.
//
// Pure: no React, no Firestore. The error is inspected by its `code`, which a
// FirestoreError carries as "permission-denied".

const ASK_AN_ADMIN = "If you think you should, ask an administrator to check your role.";

function isPermissionDenied(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return (
    typeof code === "string" &&
    (code === "permission-denied" || code.endsWith("/permission-denied"))
  );
}

/**
 * A message for a failed Firestore call. `collections` is the collection the
 * call touched — or, when a page reads several at once and cannot tell which
 * one failed, the likely ones, all named rather than a guess at one.
 * `fallback` is used when the error carries no message of its own.
 */
export function accessErrorMessage(
  error: unknown,
  collections: string | readonly string[],
  fallback = "Something went wrong talking to Firestore."
): string {
  if (isPermissionDenied(error)) {
    const names = (typeof collections === "string" ? [collections] : [...collections]).filter(Boolean);
    if (names.length === 1) {
      return `You don't have permission to change or read ${names[0]}. ${ASK_AN_ADMIN}`;
    }
    if (names.length > 1) {
      return (
        `You don't have permission to read one of ${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}. ` +
        ASK_AN_ADMIN
      );
    }
    return `You don't have permission to do that. ${ASK_AN_ADMIN}`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
