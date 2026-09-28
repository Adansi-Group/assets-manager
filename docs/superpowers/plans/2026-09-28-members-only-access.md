# Members-Only Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only people on the Users page (the `members` collection, keyed by email) can use Assets Station, enforced by Firestore rules as well as the app.

**Architecture:** A new `members` collection keyed by lower-cased email replaces `users` as the access list. The app's `onAuthStateChanged` handler asks a pure `decideAccess()` whether the signed-in email is a member and signs non-members straight out with a message the login page shows. A `firestore.rules` file kept in the repo is pasted into the console; it checks membership and role on every read and write.

**Tech Stack:** React 19 + TypeScript, Vite, Firebase Auth + Firestore (web SDK v9 modular), Vitest, Tailwind, SweetAlert2 (`Swal`), lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-28-members-only-access-design.md`

## Global Constraints

- **Collection name is exactly `members`; document id is the lower-cased, trimmed email.**
- **Email normalisation everywhere:** `email.trim().toLowerCase()` — on write, on lookup, in rules (`request.auth.token.email.lower()`).
- **Exact copy:**
  - Not a member: `You don't have access to Assets Station. Ask an administrator to add you.`
  - Lookup failed: `Couldn't check your access. Please try again.`
- **Never fall back to a default role.** No member document → no access. Failed lookup → no access.
- **Roles are the existing `UserRole`** (`"Admin" | "IT Manager" | "HR Manager" | "Viewer"`) and permissions stay in `ROLE_PERMISSIONS` (`src/types/users.ts`). Do not change that matrix.
- **No `createUserWithEmailAndPassword` anywhere in `src/`** after this plan (it signs the admin out).
- **The old `users` collection is not read or written by new code** and is not deleted by any task; deletion is a manual switch-over step.
- **Pure logic lives in `src/access/*.ts` with colocated `*.test.ts`**; no React and no Firestore imports there.
- **Firestore cannot be read from a script on this account.** No task may rely on live data; no task writes to production.
- **Test command:** `npm test` (from `adansi-inventory/`). Single file: `npx vitest run <path>`. Also `npx tsc -b --noEmit`, `npx eslint <files>`, `npm run build`. `src/pages/gadgets/ReturnedDevices.tsx:31` has a known pre-existing eslint error.
- **Paths below are relative to `adansi-inventory/`**, except `firestore.rules` and `docs/`, which are at the repo root.
- **Commit messages** end with:
  ```
  Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
  ```

## Review Focus

1. **Email case / whitespace.** A member added as `Mannan@AdansiTravels.com ` must be let in when Google reports `mannan@adansitravels.com` (and vice versa). Pinned in Task 1 (`normalizeEmail`, `decideAccess`) and Task 2 (service normalises ids).
2. **The sign-out → redirect loses the refusal message.** `signOut` fires `onAuthStateChanged(null)`; if that clears the message, the person sees a blank login page and thinks it's broken. Pinned in Task 3 (refusal is kept in state set *before* `signOut`, cleared only on the next sign-in attempt).
3. **A flash of the dashboard before refusal.** Routing must not treat "Firebase says signed in" as "allowed in" while the member check is still running. Pinned in Task 3 (routes key on the decided member, a loading state covers the check).
4. **An admin locking everyone out.** Removing yourself or demoting yourself must be refused. Pinned in Task 1 (`memberChangeProblem`) and Task 4 (buttons disabled + handler refuses).
5. **Adding a duplicate member overwrites an existing role.** `setDoc` on an existing id would silently replace a person's role. Pinned in Task 2 (`addMember` refuses when the doc exists).

---

## File Structure

**Create:**
- `src/access/members.ts` — pure: `normalizeEmail`, `decideAccess`, `memberChangeProblem`, `ACCESS_COPY`
- `src/access/members.test.ts`
- `src/types/member.ts` — `Member` type
- `src/services/memberService.ts` — Firestore CRUD for `members`
- `firestore.rules` (repo root) — the rules to paste into the console
- `docs/superpowers/runbooks/2026-09-28-members-switch-over.md` — switch-over steps + Rules Playground checklist

**Modify:**
- `src/App.tsx` — sign-in gate; routes key on the member
- `src/pages/Login.tsx` — show the refusal notice
- `src/pages/Users.tsx` — manage `members` instead of `users`
- `src/toners/accessErrors.ts` + its test — permission-denied copy now that rules enforce roles

---

### Task 1: Pure access decisions

**Files:**
- Create: `src/access/members.ts`
- Test: `src/access/members.test.ts`
- Create: `src/types/member.ts`

**Interfaces:**
- Produces:
  - `type Member = { email: string; name: string; role: UserRole; department?: string; createdAt: string; addedBy?: string }` (in `src/types/member.ts`)
  - `normalizeEmail(email: string | null | undefined): string` — `""` for null/undefined/blank
  - `type MemberLookup = { status: "found"; member: Member } | { status: "missing" } | { status: "failed" }`
  - `type AccessDecision = { allowed: true; member: Member } | { allowed: false; reason: "no-email" | "not-member" | "lookup-failed" }`
  - `decideAccess(tokenEmail: string | null | undefined, lookup: MemberLookup): AccessDecision`
  - `ACCESS_COPY: { notMember: string; lookupFailed: string }` — exact strings from Global Constraints
  - `refusalMessage(reason: "no-email" | "not-member" | "lookup-failed"): string` — `no-email` and `not-member` → `ACCESS_COPY.notMember`; `lookup-failed` → `ACCESS_COPY.lookupFailed`
  - `memberChangeProblem(actingEmail: string, target: Member, change: { kind: "remove" } | { kind: "edit"; role: UserRole }): string | null` — `null` when allowed; a sentence when refused

- [ ] **Step 1: Create the Member type**

```ts
// src/types/member.ts
import type { UserRole } from "./users";

/** One person allowed into Assets Station. Stored at members/{email}. */
export interface Member {
  /** Lower-cased and trimmed; equals the document id. */
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  createdAt: string;
  /** Email of the admin who added them. */
  addedBy?: string;
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/access/members.test.ts
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
    expect(decideAccess("eobeng@adansitravels.com", { status: "found", member: m })).toEqual({
      allowed: true,
      member: m,
    });
  });
  it("refuses a signed-in person with no email", () => {
    expect(decideAccess("", { status: "missing" })).toEqual({ allowed: false, reason: "no-email" });
    expect(decideAccess(null, { status: "missing" })).toEqual({ allowed: false, reason: "no-email" });
  });
  it("refuses a non-member", () => {
    expect(decideAccess("stranger@gmail.com", { status: "missing" })).toEqual({
      allowed: false,
      reason: "not-member",
    });
  });
  it("refuses when the lookup failed, never defaulting to a role", () => {
    expect(decideAccess("eobeng@adansitravels.com", { status: "failed" })).toEqual({
      allowed: false,
      reason: "lookup-failed",
    });
  });
  it("refuses a found document whose email does not match the token", () => {
    // Defence in depth: the caller looked up the wrong id.
    expect(
      decideAccess("eobeng@adansitravels.com", { status: "found", member: member("hr@adansitravels.com") })
    ).toEqual({ allowed: false, reason: "not-member" });
  });
  it("matches regardless of case in the token", () => {
    const m = member("mannan@adansitravels.com");
    expect(decideAccess("Mannan@AdansiTravels.com", { status: "found", member: m }).allowed).toBe(true);
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/access/members.test.ts`
Expected: FAIL — cannot resolve `./members`.

- [ ] **Step 4: Implement**

```ts
// src/access/members.ts
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/access/members.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add src/access/members.ts src/access/members.test.ts src/types/member.ts
git commit -m "$(cat <<'EOF'
feat(access): decide who may use the app from a members list

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Member service

**Files:**
- Create: `src/services/memberService.ts`

**Interfaces:**
- Consumes: `Member` (`src/types/member.ts`), `normalizeEmail`, `MemberLookup` (`src/access/members.ts`), `db` (`src/firebase/firebase.ts`)
- Produces:
  - `MEMBERS_COLLECTION = "members"`
  - `lookupMember(email: string): Promise<MemberLookup>` — never throws: `found` / `missing` / `failed` (on any error, logged with `console.error`)
  - `getMembers(): Promise<Member[]>` — throws on failure (never returns `[]` on error); sorted by name
  - `addMember(input: Omit<Member, "createdAt" | "addedBy">, addedBy: string): Promise<void>` — normalises the email, refuses (throws `Error("<email> is already on the list.")`) if the doc exists, refuses a blank email or name; strips undefined fields; sets `createdAt` to `new Date().toISOString()`
  - `updateMember(email: string, patch: Pick<Member, "name" | "role"> & { department?: string }): Promise<void>` — never changes `email`/`createdAt`
  - `removeMember(email: string): Promise<void>`

- [ ] **Step 1: Implement the service**

Follow the pattern of `src/services/tonerStockService.ts` (throwing reads, undefined-stripping writes). Use `doc(db, MEMBERS_COLLECTION, normalizeEmail(email))` for every single-document call. `addMember` must use a transaction so "check it doesn't exist, then create" cannot race:

```ts
// src/services/memberService.ts
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Member } from "../types/member";
import { normalizeEmail, type MemberLookup } from "../access/members";

export const MEMBERS_COLLECTION = "members";

const memberRef = (email: string) => doc(db, MEMBERS_COLLECTION, normalizeEmail(email));

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Never throws: the caller turns a failure into "no access", not a default role. */
export async function lookupMember(email: string): Promise<MemberLookup> {
  const id = normalizeEmail(email);
  if (!id) return { status: "missing" };
  try {
    const snap = await getDoc(memberRef(id));
    if (!snap.exists()) return { status: "missing" };
    return { status: "found", member: { ...(snap.data() as Member), email: id } };
  } catch (error) {
    console.error("Could not look up member:", error);
    return { status: "failed" };
  }
}

/** Throws on failure: an empty list would read as "nobody has access". */
export async function getMembers(): Promise<Member[]> {
  const snap = await getDocs(collection(db, MEMBERS_COLLECTION));
  return snap.docs
    .map((d) => ({ ...(d.data() as Member), email: d.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addMember(
  input: Omit<Member, "createdAt" | "addedBy">,
  addedBy: string
): Promise<void> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email) throw new Error("Enter an email address.");
  if (!name) throw new Error("Enter a name.");
  const ref = memberRef(email);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) throw new Error(`${email} is already on the list.`);
    tx.set(
      ref,
      withoutUndefined({
        email,
        name,
        role: input.role,
        department: input.department?.trim() || undefined,
        createdAt: new Date().toISOString(),
        addedBy: normalizeEmail(addedBy) || undefined,
      })
    );
  });
}

export async function updateMember(
  email: string,
  patch: Pick<Member, "name" | "role"> & { department?: string }
): Promise<void> {
  const name = patch.name.trim();
  if (!name) throw new Error("Enter a name.");
  await updateDoc(memberRef(email), {
    name,
    role: patch.role,
    department: patch.department?.trim() ?? "",
  });
}

export async function removeMember(email: string): Promise<void> {
  await deleteDoc(memberRef(email));
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/services/memberService.ts`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/services/memberService.ts
git commit -m "$(cat <<'EOF'
feat(access): add members service keyed by email

Adding refuses an email that is already listed, so a mistyped add can
never silently replace someone's role.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Sign-in gate and login notice

**Files:**
- Modify: `src/App.tsx` (auth effect ~lines 39-75; routes ~lines 94-205)
- Modify: `src/pages/Login.tsx`

**Interfaces:**
- Consumes: `lookupMember` (Task 2), `decideAccess`, `refusalMessage`, `RefusalReason` (Task 1), `signOut` from `firebase/auth`
- Produces: `Login` accepts `notice?: string | null` and `onClearNotice?: () => void`; `Users` receives `currentUser: User` (Task 4 consumes it)

- [ ] **Step 1: Replace the auth effect in `App.tsx`**

Remove the `doc`/`getDoc` import and the `users/{uid}` read. New state: `currentUser: User | null`, `checking: boolean` (true from mount until the first decision), `notice: string | null`. The handler:

```tsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      // Keep any refusal notice: this callback also fires after we sign a
      // non-member out, and the login page must still say why.
      setCurrentUser(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    const lookup = await lookupMember(fbUser.email ?? "");
    const decision = decideAccess(fbUser.email, lookup);
    if (!decision.allowed) {
      setNotice(refusalMessage(decision.reason));
      setCurrentUser(null);
      await signOut(auth);
      setChecking(false);
      return;
    }
    setNotice(null);
    setCurrentUser({
      id: fbUser.uid,
      email: decision.member.email,
      name: decision.member.name,
      role: decision.member.role,
      department: decision.member.department,
      createdAt: decision.member.createdAt,
    });
    setChecking(false);
  });
  return () => unsubscribe();
}, []);
```

`firebaseUser` state is removed. The existing loading spinner renders while `checking` is true.

- [ ] **Step 2: Key every route on `currentUser`, not on "Firebase says signed in"**

Replace each `firebaseUser ? … : …` in the routes with `currentUser ? … : …`:
- `/` → `currentUser ? <Navigate to="/dashboard" /> : <Login notice={notice} onClearNotice={() => setNotice(null)} />`
- the layout route → `currentUser ? <AdminLayout currentUser={currentUser} /> : <Navigate to="/" />`
- `*` → `<Navigate to={currentUser ? "/dashboard" : "/"} />`
- `/users` → `<Users currentUser={currentUser!} />` (inside the existing `canAccess("manage_users")` guard, so `currentUser` is non-null there; prefer narrowing over `!` if the surrounding code allows).

- [ ] **Step 3: Show the notice on the login page**

In `Login.tsx`: accept `{ notice, onClearNotice }: { notice?: string | null; onClearNotice?: () => void }`. Render, above the `SIGN IN` heading when `notice` is set:

```tsx
{notice && (
  <div role="alert" className="mb-6 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
    {notice}
  </div>
)}
```

Call `onClearNotice?.()` at the start of `handleLogin` and `handleGoogleLogin` (a new attempt clears the old reason). Remove both `navigate("/dashboard")` calls after sign-in — the route for `/` redirects once the member check passes, and navigating early would race the check. Remove `useNavigate` if it becomes unused.

- [ ] **Step 4: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/App.tsx src/pages/Login.tsx && npm test`
Expected: clean; all tests pass. `grep -n "\"users\"" src/App.tsx` → no hits.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/pages/Login.tsx
git commit -m "$(cat <<'EOF'
feat(access): sign out anyone who is not on the members list

A signed-in person with no members entry is refused with a message the
login page keeps showing after the sign-out. There is no default role.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Users page manages members

**Files:**
- Modify: `src/pages/Users.tsx` (whole file; 452 lines today)

**Interfaces:**
- Consumes: `getMembers`, `addMember`, `updateMember`, `removeMember` (Task 2); `memberChangeProblem`, `normalizeEmail` (Task 1); `Member` type; `currentUser: User` prop (Task 3); `accessErrorMessage` (`src/toners/accessErrors.ts`)

- [ ] **Step 1: Switch the data source**

- Props: `export default function Users({ currentUser }: { currentUser: User })`.
- Delete the imports of `collection, getDocs, doc, setDoc, updateDoc, deleteDoc`, `createUserWithEmailAndPassword`, `auth`, `db`.
- `loadUsers` → `getMembers()`. On failure, show an error panel with a Retry button (message via `accessErrorMessage(error, "members")`) — never an empty table.
- Row key and identity: `member.email` (no `id`). Remove the "ID: …" subtitle; show the email under the name instead.
- The stat cards (Total, Admins, Managers, Viewers) count members.

- [ ] **Step 2: Add member (no password)**

The Add dialog has: Email, Name, Role (select: Admin, IT Manager, HR Manager, Viewer — default Viewer), Department. **No password field.** Help text under the email field: `They sign in with the Google account for this email.` On confirm: `await addMember({ email, name, role, department }, currentUser.email)`. Errors (duplicate, blank) show in a `Swal` with the thrown message. Reload after success.

- [ ] **Step 3: Edit and remove with self-protection**

- Edit dialog: Name, Role, Department. Email shown read-only. Before saving: `const problem = memberChangeProblem(currentUser.email, member, { kind: "edit", role })`; if `problem`, show it in a `Swal` and do not save. Then `updateMember(member.email, { name, role, department })`.
- Remove: `const problem = memberChangeProblem(currentUser.email, member, { kind: "remove" })`; if `problem`, the button is disabled (with the problem as its `title`) and the handler refuses anyway. Confirmation text: `Remove <name> (<email>)? They will no longer be able to sign in. Their Google or password account itself is not deleted.` Then `removeMember(member.email)`, reload.
- Every write is wrapped in try/catch → `Swal` error using `accessErrorMessage(error, "members")` → reload in `finally`.

- [ ] **Step 4: Verify**

Run: `npx tsc -b --noEmit && npx eslint src/pages/Users.tsx && npm test && npm run build`
Expected: clean (apart from the known ReturnedDevices error if you lint all of `src/`); all tests pass.
Run: `grep -rn "createUserWithEmailAndPassword\|collection(db, \"users\")\|doc(db, \"users\"" src`
Expected: only `src/services/authService.ts`'s `register` export, if it still exists. If `register` has no callers (`grep -rn "register(" src`), delete it from `authService.ts` so the constraint "no createUserWithEmailAndPassword in src/" holds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Users.tsx src/services/authService.ts
git commit -m "$(cat <<'EOF'
feat(access): manage the members list from the Users page

Adding someone no longer creates an account in the browser, which used
to sign the admin out. You cannot remove yourself or change your own
role.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Firestore rules, error copy, and switch-over runbook

**Files:**
- Create: `firestore.rules` (repo root)
- Create: `docs/superpowers/runbooks/2026-09-28-members-switch-over.md`
- Modify: `adansi-inventory/src/toners/accessErrors.ts` and `adansi-inventory/src/toners/accessErrors.test.ts`

**Interfaces:**
- Consumes: the collection list and role scopes below (verified against every write call site in `src/` on 2026-09-28).

Write-site inventory the rules must match (from `grep -rnE "(addDoc|setDoc|updateDoc|deleteDoc|runTransaction)\(" src`):

| Collection | Written by | Roles that reach that page |
|---|---|---|
| printers | printerService, replacement transaction | Admin, IT Manager |
| toner_stock, toner_deliveries, toner_replacements, toner_types | tonerStockService, tonerDeliveryService, replacement transaction, AddTonerModal (addTonerType) | Admin, IT Manager |
| a4_sheets | a4SheetService | Admin, IT Manager |
| internet_usage | internetUsageService | Admin, IT Manager |
| inventory | inventoryService (top-level docs only) | Admin, IT Manager |
| settings/printer_options | printerOptionsService (when adding printers) | Admin, IT Manager |
| gadgets | gadgetsService | Admin, HR Manager |
| support_tickets | supportTicketService (page open to every member) | every member |
| notifications | notificationService (created by Printers/InternetUsage actions; read/dismissed by everyone) | every member |
| notification_settings | notificationService (Settings page) | Admin |
| members | memberService (Users page) | Admin |
| toners | locationMigration (Settings, legacy one-off) | nobody — frozen |
| users | nothing after this plan | nobody |

- [ ] **Step 1: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---- Who is asking -------------------------------------------------
    function signedIn() {
      return request.auth != null
        && request.auth.token.email is string
        && request.auth.token.email.size() > 0;
    }
    function memberPath() {
      return /databases/$(database)/documents/members/$(request.auth.token.email.lower());
    }
    function isMember() { return signedIn() && exists(memberPath()); }
    function hasRole(roles) { return isMember() && get(memberPath()).data.role in roles; }

    function it()  { return hasRole(['Admin', 'IT Manager']); }
    function hr()  { return hasRole(['Admin', 'HR Manager']); }
    function admin() { return hasRole(['Admin']); }

    // ---- The access list -----------------------------------------------
    match /members/{email} {
      allow read: if isMember();
      allow write: if admin();
    }

    // ---- IT scope -------------------------------------------------------
    match /printers/{id}           { allow read: if isMember(); allow write: if it(); }
    match /toner_stock/{id}        { allow read: if isMember(); allow write: if it(); }
    match /toner_deliveries/{id}   { allow read: if isMember(); allow write: if it(); }
    match /toner_replacements/{id} { allow read: if isMember(); allow write: if it(); }
    match /toner_types/{id}        { allow read: if isMember(); allow write: if it(); }
    match /a4_sheets/{id}          { allow read: if isMember(); allow write: if it(); }
    match /internet_usage/{id}     { allow read: if isMember(); allow write: if it(); }
    match /inventory/{id}          { allow read: if isMember(); allow write: if it(); }

    // settings: IT may write printer_options only; everything else Admin.
    // Firestore OR-combines rules, so express this in ONE match block.
    match /settings/{id} {
      allow read: if isMember();
      allow write: if admin() || (id == 'printer_options' && it());
    }

    // ---- HR scope -------------------------------------------------------
    match /gadgets/{id}            { allow read: if isMember(); allow write: if hr(); }

    // ---- Every member ---------------------------------------------------
    match /support_tickets/{id}    { allow read, write: if isMember(); }
    match /notifications/{id}      { allow read, write: if isMember(); }

    // ---- Admin only -----------------------------------------------------
    match /notification_settings/{id} { allow read: if isMember(); allow write: if admin(); }

    // ---- Frozen ---------------------------------------------------------
    match /toners/{id}             { allow read: if isMember(); allow write: if false; }
    match /users/{id}              { allow read, write: if false; }

    // No catch-all: any collection not named above is denied.
  }
}
```

Before committing, re-run the write-site grep above and confirm every collection in `src/` appears in this file with the scope in the table; if any collection is missing (e.g. a subcollection), add it with the matching scope and note it in the commit body.

- [ ] **Step 2: Update the permission-denied copy (TDD)**

Now that rules enforce roles, "Add a rule in the console" is usually the wrong advice — the likelier cause is that the person's role can't do this. Change `accessErrorMessage` so the single-collection permission-denied message reads exactly:

`You don't have permission to change or read <collection>. If you think you should, ask an administrator to check your role.`

and the several-collections form:

`You don't have permission to read one of <a>, <b> or <c>. If you think you should, ask an administrator to check your role.`

and the no-name form: `You don't have permission to do that. If you think you should, ask an administrator to check your role.`

Update the file header comment accordingly (the fix is no longer "always a console rule"). First update `accessErrors.test.ts` to expect the new strings; run `npx vitest run src/toners/accessErrors.test.ts` → FAIL; then change the implementation; run again → PASS.

- [ ] **Step 3: Write the switch-over runbook**

Create `docs/superpowers/runbooks/2026-09-28-members-switch-over.md` containing, verbatim in substance:

1. **Seed members first, by hand, BEFORE deploying the new app.** The new app lets nobody in while
   `members` is empty — including you — so the Users page can't be used to create the first entries.
   Firebase console → Firestore → Data → Start collection `members`, then add four documents
   (document id = the email, lower case; fields: `email` (string, same as id), `name` (string),
   `role` (string), `createdAt` (string, e.g. `2026-09-28T00:00:00.000Z`)):
   `eobeng@adansitravels.com` Admin · `it-intern@adansitravels.com` Admin (temporary) ·
   `mannan@adansitravels.com` Admin · `hr@adansitravels.com` HR Manager.
2. **Deploy the new app** (merge this branch; run or host it). The old rule still allows everything, and
   you get in because your token email is on the list.
3. **2b. Refresh your own Auth record.** Firebase console → Authentication → Users → delete
   `it-intern@adansitravels.com`, then sign in with Google again. The new record's email is
   `eobeng@adansitravels.com`. Confirm you get in. Then remove `it-intern@` from Users.
4. **Test the rules in the Rules Playground** (Firestore → Rules → Rules Playground), pasting
   `firestore.rules` into the editor first but **not publishing**. For each line, set the authenticated
   user's email claim and run the operation; the expected result is given:
   - no auth, get `/printers/x` → denied
   - `stranger@gmail.com`, get `/printers/x` → denied
   - member with role Viewer, get `/printers/x` → allowed; create `/printers/x` → denied
   - IT Manager, update `/toner_stock/x` → allowed; update `/gadgets/x` → denied; create `/members/y` → denied
   - IT Manager, update `/settings/printer_options` → allowed; update `/settings/other` → denied
   - HR Manager, update `/gadgets/x` → allowed; update `/printers/x` → denied
   - Admin, create `/members/y` → allowed
   - Viewer, create `/support_tickets/x` → allowed
   - Admin, update `/toners/x` → denied
   - Admin, get `/some_new_collection/x` → denied
   - email claim `EOBENG@AdansiTravels.com` with members doc `eobeng@adansitravels.com`, get `/printers/x` → allowed
   (The Playground reads real `members` docs for `exists`/`get`, so seed step 2 must be done first; for
   the Viewer/IT/HR cases add a temporary member with that role, test, then remove it.)
5. **Publish** `firestore.rules`. Keep the old one-line rule text somewhere (it's in this runbook below) for rollback.
6. **Switch off password sign-up:** Authentication → Settings → User actions → untick **Enable create (sign-up)** → Save. hr@ keeps signing in with its existing password.
7. **Live check:** eobeng@, mannan@ and hr@ can sign in; a Google account not on the list is refused with
   "You don't have access to Assets Station. Ask an administrator to add you."
8. **When hosting on Vercel:** Authentication → Settings → Authorized domains → Add domain → the Vercel address.
9. **Clean up (confirm first):** delete the documents in `users`; delete the `admin@test.com` Auth account;
   optionally delete the four Gmail Auth accounts.

**Rollback:** re-publish
```
rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if request.auth != null; } } }
```
and redeploy the previous app build.

- [ ] **Step 4: Verify**

Run (from `adansi-inventory/`): `npm test && npx tsc -b --noEmit && npm run build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules docs/superpowers/runbooks/2026-09-28-members-switch-over.md adansi-inventory/src/toners/accessErrors.ts adansi-inventory/src/toners/accessErrors.test.ts
git commit -m "$(cat <<'EOF'
feat(access): add Firestore rules that check membership and role

Every read requires a members entry; every write requires a role that
the app already allows to make it. The legacy toners and users
collections are frozen, and unnamed collections are denied.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
)"
```
