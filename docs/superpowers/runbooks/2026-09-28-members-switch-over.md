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
mannan@ — is stopped by the rules and the app instead. A sign-in is trusted only if:

- the provider verified the email (every Google sign-in is), **or**
- the person's `members` entry has `passwordSignIn: true` (hr@ only).

`passwordSignIn` is safe only while that person's password account exists in Firebase Authentication:
the existing account is what stops anyone else registering the address. **If you ever delete hr@'s
account in Authentication, remove `passwordSignIn` from its `members` entry first.**

## 1. Seed `members` by hand, BEFORE deploying the new app

The new app lets nobody in while `members` is empty — including you — so the Users page can't create
the first entries.

Firebase console → Firestore → Data → Start collection `members`, then add four documents.

**Document id = the email, all lower case, no spaces before or after.** An id typed as
`Mannan@AdansiTravels.com` will show on the Users page but will never let that person in.

Fields for every document:

| Field | Type | Value |
|---|---|---|
| `email` | string | same as the document id |
| `name` | string | the person's name |
| `role` | string | exactly `Admin`, `IT Manager`, `HR Manager` or `Viewer` |
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

## 2. Deploy the new app

Merge this branch; run or host it. The old rule still allows everything, and you get in because your
token email (`it-intern@`) is on the list.

## 3. Refresh your own Auth record (spec step 2b)

Firebase console → Authentication → Users → delete `it-intern@adansitravels.com`, then sign in with
Google again. The new record's email is `eobeng@adansitravels.com`. Confirm the app lets you in. Then
remove `it-intern@adansitravels.com` on the Users page.

Nothing is lost: roles live in `members`, keyed by email, not by account.

## 4. Test the rules in the Rules Playground — do not publish yet

Firestore → Rules → Rules Playground. Paste `firestore.rules` into the editor first, but **do not
press Publish**.

For each line, switch **Authenticated** on, set the email and the **email verified** tick as given,
run the operation, and compare. "Verified" below means the tick is on.

The Playground reads the real `members` documents, so step 1 must be done first. For the Viewer and
IT Manager lines, add a temporary member with that role on the Users page, test, then remove it.

Who gets in:

- [ ] not authenticated, get `/printers/x` → **denied**
- [ ] `stranger@gmail.com`, verified, get `/printers/x` → **denied**
- [ ] a Viewer, verified, get `/printers/x` → **allowed**
- [ ] `EOBENG@AdansiTravels.com` (capitals), verified, get `/printers/x` → **allowed**
- [ ] `mannan@adansitravels.com`, **not** verified, get `/printers/x` → **denied** (a fake password account)
- [ ] `hr@adansitravels.com`, **not** verified, get `/gadgets/x` → **allowed** (the `passwordSignIn` exception)

Looking yourself up:

- [ ] `stranger@gmail.com`, verified, get `/members/stranger@gmail.com` → **allowed** (nothing is there)
- [ ] `stranger@gmail.com`, verified, get `/members/eobeng@adansitravels.com` → **denied**
- [ ] `mannan@adansitravels.com`, **not** verified, get `/members/mannan@adansitravels.com` → **denied**

What each role may change:

- [ ] a Viewer, create `/printers/x` → **denied**
- [ ] a Viewer, create `/support_tickets/x` → **allowed**
- [ ] an IT Manager, update `/toner_stock/x` → **allowed**
- [ ] an IT Manager, update `/gadgets/x` → **denied**
- [ ] an IT Manager, create `/members/y` → **denied**
- [ ] an IT Manager, update `/settings/printer_options` → **allowed**
- [ ] an IT Manager, update `/settings/other` → **denied**
- [ ] `hr@adansitravels.com`, update `/gadgets/x` → **allowed**
- [ ] `hr@adansitravels.com`, update `/printers/x` → **denied**
- [ ] an Admin, create `/members/y` → **allowed**
- [ ] an Admin, update `/toners/x` → **denied** (frozen)
- [ ] an Admin, get `/some_new_collection/x` → **denied** (not named in the rules)

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

Re-publish the old rule:

```
rules_version = '2';
service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if request.auth != null; } } }
```

and redeploy the previous app build. The old `users` documents still exist until step 8.
