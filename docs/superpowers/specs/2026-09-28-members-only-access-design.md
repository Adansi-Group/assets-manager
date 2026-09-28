# Members-only access — design

**Date:** 2026-09-28
**Status:** approved in conversation, awaiting spec review

## Amendment — 2026-09-28, during implementation

**Sign-up stays ON; switch-over step 4 is withdrawn.** Firebase's "Enable create (sign-up)" switch
blocks every first-time sign-in, Google included, so it would refuse mannan@, the re-created eobeng@
account (step 2b) and every member added later. The user chose to enforce trust in the rules and the
app instead: a sign-in counts only if it is a Google sign-in with a verified email (`email_verified`
and `sign_in_provider == 'google.com'`), or a password sign-in by a member whose entry carries
`passwordSignIn: true` (hr@ only, set by hand). A listed person whose entry has a role the app does not
know is refused with "Your entry on the members list has a mistake. Ask an administrator to check it." This replaces the "Password
accounts" paragraph in §4. A person may also read their **own** `members` entry, so the app can tell
"not on the list" from "couldn't check". The runbook
(`docs/superpowers/runbooks/2026-09-28-members-switch-over.md`) is the current order of steps.

## Problem

Anyone with any Google account can sign in to Assets Station. The app then treats an unknown person as a
"Viewer" (`src/App.tsx:55-62`), but that limit exists only in the screens. Firestore's only rule is:

```
match /{document=**} { allow read, write: if request.auth != null; }
```

so any signed-in person — including a stranger — can read, change or delete every record, including the
`users` collection that holds everyone's role (they could make themselves Admin). Four personal Gmail
accounts have already signed in without being on the Users page. The app's Firebase config is public by
design, so hiding the URL protects nothing. The boss wants a shared link (Vercel), which widens exposure.

A second, existing defect: the Users page's **Add User** calls `createUserWithEmailAndPassword` in the
browser, which signs the admin out and signs the new person in.

## Goal

**If you are not on the Users page, you cannot use the app or its data.** Enforced by Firestore rules, not
just the UI. Within the app, each role can change only what the app already permits it to.

## Decisions (from the user)

- The four Gmail accounts (emmascotravels@, obengkweku43@, kwekukoopoow5@, obengemma977@gmail.com) **lose
  access**.
- `admin@test.com` ("System Admin") is **removed**.
- `hr@adansitravels.com` **keeps its password login**, role HR Manager.
- `mannan@adansitravels.com` (the boss) signs in **with Google**, role **Admin**.
- The user's own Google account is now **`eobeng@adansitravels.com`** (renamed from it-intern@), role **Admin**.
  Verified 2026-09-28: Google's provider data says `eobeng@adansitravels.com`, but the Firebase Auth record
  and the ID token's `email` claim still say `it-intern@adansitravels.com` (Firebase stores the email at
  account creation and does not refresh it). Rules read the token claim, so the old Auth record must be
  replaced before the rules go live — see switch-over step 2b.

## Design

### 1. The access list: `members`

New collection `members`, one document per person, **document id = lower-cased email**:

```ts
interface Member {
  email: string;        // lower-cased; equals the doc id
  name: string;
  role: UserRole;       // "Admin" | "IT Manager" | "HR Manager" | "Viewer" (existing type)
  department?: string;
  createdAt: string;    // ISO
  addedBy?: string;     // email of the admin who added them
}
```

Keyed by email because a person can be added before they have ever signed in (Google users have no uid
until first sign-in), and because Firestore rules can read `request.auth.token.email` directly.

Starting list: eobeng@adansitravels.com (Admin), mannan@adansitravels.com (Admin),
hr@adansitravels.com (HR Manager). **Transitional:** it-intern@adansitravels.com (Admin) is also listed
until step 2b is confirmed, then removed. Nobody else.

The old `users` collection is **not** used by the new code and is deleted at the end of switch-over
(step 6), not before — it is the fallback if the switch-over is rolled back.

### 2. Sign-in

`src/App.tsx`'s `onAuthStateChanged` handler:

1. Signed out → as today.
2. Signed in, no email on the token → sign out; show the no-access message.
3. Read `members/{email.toLowerCase()}`:
   - exists → `currentUser` built from it (id = uid, plus member fields). Permissions unchanged
     (`hasPermission` / `ROLE_PERMISSIONS`).
   - does not exist → `signOut`, return to the login page showing:
     **"You don't have access to Assets Station. Ask an administrator to add you."**
   - read fails (network, rules) → `signOut`, login page shows:
     **"Couldn't check your access. Please try again."** Never fall back to Viewer.
4. The login page shows the message passed to it (e.g. via router state or a small auth-message store);
   it must survive the sign-out → redirect.

The pure decision (token email + member lookup result → allowed member | refusal reason) lives in a pure
module with a colocated test.

### 3. Users page manages `members`

- **List:** all `members`, same columns as today.
- **Add:** email, name, role, department. **No password.** Writes `members/{email}`. Refuses a duplicate
  email. The copy says the person signs in with their Google account for that email. No call to
  `createUserWithEmailAndPassword` anywhere (fixes the sign-out bug).
- **Edit:** name, role, department. Email is the id and cannot be edited (remove + add instead).
- **Remove:** deletes `members/{email}`; confirmation names the person. Their Firebase Auth account is left
  alone (they simply can't get in); the page says so.
- **Self-protection:** an admin cannot remove themselves or change their own role (button disabled, and the
  save handler refuses) — so the last admin can't lock everyone out by accident.
- Emails are trimmed and lower-cased on write and lookup.

### 4. Firestore rules (the real lock)

Kept in the repo as `firestore.rules` (root of the repo) so changes are reviewed in git; the user pastes it
into Firebase console → Firestore → Rules and publishes. Shape:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null && request.auth.token.email != null; }
    function memberPath() { return /databases/$(database)/documents/members/$(request.auth.token.email.lower()); }
    function isMember() { return signedIn() && exists(memberPath()); }
    function role() { return get(memberPath()).data.role; }
    function hasRole(roles) { return isMember() && role() in roles; }

    match /members/{email}        { allow read: if isMember(); allow write: if hasRole(['Admin']); }

    // IT Manager scope
    match /printers/{id}          { allow read: if isMember(); allow write: if hasRole(['Admin','IT Manager']); }
    match /toner_stock/{id}       { ...same... }
    match /toner_deliveries/{id}  { ...same... }
    match /toner_replacements/{id}{ ...same... }
    match /toner_types/{id}       { ...same... }
    match /a4_sheets/{id}         { ...same... }
    match /internet_usage/{id}    { ...same... }
    match /inventory/{id}         { ...same... }   // plus any subcollections inventory uses
    match /settings/printer_options { ...same... }

    // HR scope
    match /gadgets/{id}           { allow read: if isMember(); allow write: if hasRole(['Admin','HR Manager']); }

    // Every member
    match /support_tickets/{id}   { allow read, write: if isMember(); }
    match /notifications/{id}     { allow read, write: if isMember(); }

    // Admin only
    match /notification_settings/{id} { allow read: if isMember(); allow write: if hasRole(['Admin']); }
    match /settings/{id}          { allow read: if isMember(); allow write: if hasRole(['Admin']); }

    // Legacy, frozen: read-only for everyone
    match /toners/{id}            { allow read: if isMember(); allow write: if false; }
    match /users/{id}             { allow read, write: if false; }   // after switch-over

    // Everything else: denied (no catch-all)
  }
}
```

The role → collection mapping must match `ROLE_PERMISSIONS` in `src/types/users.ts`; the plan verifies
every write call site in `src/` against it (e.g. who writes `printers` during a replacement, whether
`inventory` has subcollections, where `settings` docs other than `printer_options` are written) and adjusts
the table before the rules are finalised. Printer-options `settings/printer_options` is written when IT
adds printers, hence IT scope; the more specific match must be ordered/written so it is not overridden by
the Admin-only `settings/{id}` rule (Firestore OR-combines matching rules — the plan must structure these
so IT gets exactly printer_options and nothing else in `settings`).

**Password accounts.** Password sign-in is only safe because new sign-ups are switched off (switch-over
step 4): nobody can create a password account for an email on the list. Existing password accounts (hr@)
keep working.

### 5. Errors

Every page already shows Firestore errors (the permission-denied helper added in the toner work names the
collection and the console fix). A member hitting a write their role doesn't allow gets
"Missing or insufficient permissions" mapped to a plain "Your role can't change this" where the page
catches it; the plan checks each write handler surfaces an error rather than failing silently.

## Switch-over (order matters — nobody gets locked out halfway)

1. **Seed `members` by hand in the Firebase console, before deploying** — the new app admits nobody
   while `members` is empty, so the Users page can't create the first entries. Add eobeng@, mannan@, hr@
   and (transitionally) it-intern@.
2. **Deploy the new app.** Old rules still allow everything; you get in because you're on the list.
   **2b. Refresh the user's own Auth record:** Firebase console → Authentication → Users → delete the
   `it-intern@adansitravels.com` account, then sign in with Google again. Firebase creates a new record whose
   email is `eobeng@adansitravels.com`. Confirm the app lets you in, then remove it-intern@ from `members`.
   Nothing is lost: roles live in `members`, keyed by email, not by uid.
3. **Publish `firestore.rules`** in the console. Test with the Rules Playground checklist below before
   publishing.
4. **Firebase console → Authentication → Settings → User actions:** untick **Enable create (sign-up)**.
5. **When hosting on Vercel:** Authentication → Settings → Authorized domains → add the Vercel domain.
6. **Clean up:** delete the `users` collection documents; delete the `admin@test.com` Auth account (and
   optionally the four Gmail Auth accounts) in the console. The agent confirms with the user before any
   deletion.

**Rollback:** re-publish the old one-line rule; the old `users` docs still exist until step 6.

## Testing

- **Pure logic, unit-tested (Vitest):** the sign-in decision (member found / not found / lookup failed /
  no email); email normalisation; Users-page self-protection rule (can't remove self / change own role).
- **Rules:** no local emulator (no Java on this machine). The plan ships a **Rules Playground checklist** —
  one line per case, run in the console before publishing:
  - non-member reads `printers` → denied
  - member Viewer reads `printers` → allowed; writes → denied
  - IT Manager writes `toner_stock` → allowed; writes `gadgets` → denied; writes `members` → denied
  - HR Manager writes `gadgets` → allowed; writes `printers` → denied
  - Admin writes `members` → allowed
  - any member writes `support_tickets` → allowed
  - anyone writes `toners` → denied
  - member reads an unlisted collection → denied
  - email case: token `IT-Intern@…` matches doc `it-intern@…`
- **App:** tsc, eslint, build, full suite. A live check after switch-over: eobeng, hr and mannan can sign
  in; a non-member Google account is refused with the message.

## Out of scope

- Hosting on Vercel (separate task; only its authorized-domain step is listed here).
- Deleting the four Gmail Auth accounts is optional cleanup, not required for security (they can't get in).
- Per-document ownership (e.g. only the ticket's author can edit it).
