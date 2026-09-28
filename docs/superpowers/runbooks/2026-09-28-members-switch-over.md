# Members-only access — switch-over runbook

**Date:** 2026-09-28
**Spec:** `docs/superpowers/specs/2026-09-28-members-only-access-design.md`
**Rules file:** `firestore.rules` (repo root)

Do the steps in order. Each one leaves the app usable, so you can stop between steps.

## What changed from the spec: sign-up stays ON

The spec said to untick **Enable create (sign-up)** in Firebase. Do **not** do that. That switch blocks
every first-time sign-in, Google included: mannan@, your own re-created eobeng@ account (step 3) and
every person you add later would be refused by Firebase with "This operation is restricted to
administrators only".

What it was meant to stop — a stranger registering a password account for a listed email such as
mannan@ — is stopped by the rules and the app instead. A sign-in is trusted only if it is:

- a **Google** sign-in whose email Google verified, **or**
- a **password** sign-in by someone whose `members` entry has `passwordSignIn: true` (hr@ only).

`passwordSignIn` is safe only while that person's password account exists in Firebase Authentication:
the existing account is what stops anyone else registering the address. **If you ever delete hr@'s
account in Authentication, remove `passwordSignIn` from its `members` entry first.**

hr@ should keep using the password form, not the Google button. A Google sign-in as hr@ would be let
in, but Firebase may then drop the password from that account.

## 0. Two checks before you start

- [ ] Authentication → Settings → **User account linking** is on "Link accounts that use the same
      email" (the default). If it says "Create multiple accounts for each identity provider", stop and
      ask before going on.
- [ ] Storage → Rules (if Storage is set up at all) does not allow every signed-in account. Sign-up
      stays on, so "signed in" means "anyone".

## 1. Seed `members` by hand, BEFORE deploying the new app

The new app lets nobody in while `members` is empty — including you — so the Users page can't create
the first entries.

Firebase console → Firestore → Data → Start collection `members`, then add four documents.

**Document id = the email, all lower case, no spaces before or after.** An id typed as
`Mannan@AdansiTravels.com` will never let that person in.

Fields for every document:

| Field | Type | Value |
|---|---|---|
| `email` | string | same as the document id |
| `name` | string | the person's name |
| `role` | string | exactly `Admin`, `IT Manager`, `HR Manager` or `Viewer` — capitals matter |
| `createdAt` | string | e.g. `2026-09-28T00:00:00.000Z` |

| Document id | role | Extra field |
|---|---|---|
| `eobeng@adansitravels.com` | Admin | |
| `it-intern@adansitravels.com` | Admin (temporary, removed in step 3) | |
| `mannan@adansitravels.com` | Admin | |
| `hr@adansitravels.com` | HR Manager | `passwordSignIn` — type **boolean**, value `true` |

`passwordSignIn` must be the **boolean** type. The text "true" does not count, and hr@ would be refused.

The Users page never sets `passwordSignIn`. If you remove hr@ on the Users page and add it again, the
field is gone and hr@ can't sign in until you add it back here.

Once you are in the app (step 2), open the Users page: an entry with a wrong id, role or name shows
what is wrong in red under the person's name.

## 2. Deploy the new app

Merge this branch; run or host it. The old rule still allows everything, and you get in because your
token email (`it-intern@`) is on the list.

## 3. Refresh your own Auth record (spec step 2b)

1. **Sign out of the app.** Deleting the account below does not end a session that is already open.
2. Firebase console → Authentication → Users → delete `it-intern@adansitravels.com`.
3. Sign in to the app with Google.
4. Open your Profile and confirm the app shows **`eobeng@adansitravels.com`**. If it still shows
   `it-intern@`, sign out and sign in again before going on.
5. Remove `it-intern@adansitravels.com` on the Users page.

Nothing is lost: roles live in `members`, keyed by email, not by account.

## 4. Test the rules in the Rules Playground — do not publish yet

Firestore → Rules → Rules Playground. Paste `firestore.rules` into the editor first, but **do not
press Publish**.

**If the editor marks any line in red after you paste, stop.** Nothing below means anything until the
file is accepted.

For each line, switch **Authenticated** on and set the **provider**, the **email** and the
**email verified** tick exactly as the line says. Before the first run, look at the auth payload
preview and confirm it contains both `email_verified` and `firebase.sign_in_provider`; if either is
missing, stop — the results would be wrong.

Shorthand: **Google** means provider `google.com` with the verified tick **on**. **Password** means
provider `password` with the verified tick **off**, unless the line says otherwise.

The Playground reads the real `members` documents, so step 1 must be done first. For the Viewer and
IT Manager lines, add a temporary member with that role on the Users page, test with that email, then
remove it.

Who gets in:

- [ ] not authenticated, get `/printers/x` → **denied**
- [ ] `stranger@gmail.com`, Google, get `/printers/x` → **denied**
- [ ] a Viewer, Google, get `/printers/x` → **allowed**
- [ ] `EOBENG@AdansiTravels.com` (capitals), Google, get `/printers/x` → **allowed**
- [ ] `mannan@adansitravels.com`, Password, get `/printers/x` → **denied** (a fake password account)
- [ ] `mannan@adansitravels.com`, provider `password` with the verified tick **on**, get `/printers/x`
      → **denied** (a fake account that became verified later)
- [ ] `hr@adansitravels.com`, Password, get `/gadgets/x` → **allowed** (the `passwordSignIn` exception)

Looking yourself up:

- [ ] `stranger@gmail.com`, Google, get `/members/stranger@gmail.com` → **allowed** (nothing is there)
- [ ] `stranger@gmail.com`, Google, get `/members/eobeng@adansitravels.com` → **denied**
- [ ] `mannan@adansitravels.com`, Password, get `/members/mannan@adansitravels.com` → **denied**

What each role may change:

- [ ] a Viewer, Google, create `/printers/x` → **denied**
- [ ] a Viewer, Google, create `/support_tickets/x` → **allowed**
- [ ] an IT Manager, Google, update `/toner_stock/x` → **allowed**
- [ ] an IT Manager, Google, update `/gadgets/x` → **denied**
- [ ] an IT Manager, Google, create `/members/y` → **denied**
- [ ] an IT Manager, Google, update `/settings/printer_options` → **allowed**
- [ ] an IT Manager, Google, update `/settings/other` → **denied**
- [ ] `hr@adansitravels.com`, Password, update `/gadgets/x` → **allowed**
- [ ] `hr@adansitravels.com`, Password, update `/printers/x` → **denied**
- [ ] `eobeng@adansitravels.com`, Google, create `/members/y` → **allowed**
- [ ] `eobeng@adansitravels.com`, Google, update `/toners/x` → **denied** (frozen)
- [ ] `eobeng@adansitravels.com`, Google, get `/some_new_collection/x` → **denied** (not named in the rules)

If any line gives the other answer, stop and do not publish.

## 5. Publish `firestore.rules`

Press Publish. The old rule is at the bottom of this page for rollback.

## 6. Live check

- [ ] eobeng@ and mannan@ can sign in with Google.
- [ ] hr@ can sign in with its password.
- [ ] A Google account that is not on the list is refused with
      "You don't have access to Assets Station. Ask an administrator to add you."
- [ ] Signed in as hr@, editing a gadget and saving it works.

## 7. When hosting on Vercel

Authentication → Settings → Authorized domains → Add domain → the Vercel address.

## 8. Clean up (confirm first)

- Delete the documents in `users`. They are the fallback if you roll back, so do this last.
- Delete the `admin@test.com` account in Authentication.
- Optional: delete the four Gmail accounts in Authentication. They can't get in either way.

## Adding someone later

Users page → Add. They sign in with the Google account for that email; nothing to do in the console.

## Rollback

**Rules only (the usual case).** Re-publish the old rule and keep the new app:

```
rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if request.auth != null; } } }
```

**The app as well.** The previous build reads each person's role from `users/<account uid>`. After
step 3 your account has a new uid, so the old app would treat you as a Viewer with no Users page.
Before redeploying the previous build: Authentication → Users → copy the **User UID** of
`eobeng@adansitravels.com`, then in Firestore create `users/<that uid>` with `email`, `name` and
`role` = `Admin`. The old `users` documents for everyone else still exist until step 8.
