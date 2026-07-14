# Feature specification

Contract ID/version: **C3 / contacts-slice v1**
Constitution version/link: **C1** — [constitution.md](constitution.md)
Human product owner: **Csaba Piya**

> Scope note: this package covers the **first vertical slice — Contacts management** plus the
> minimal data-layer foundation it needs. Companies CRUD, Interactions, and the Dashboard are
> separate later slices and are explicitly out of scope here.

## Problem and observable outcome

- User/business problem: during personal/direct outreach it is easy to lose track of who has
  been contacted, in what status a relationship is, and when the next follow-up is due
  (spec §2).
- Observable outcome: a user can create, find, view, edit and delete **contacts**, assign a
  contact to an existing company, change a contact's status, and set the next follow-up date —
  against a Postgres database seeded with sample data.
- Out of scope: Companies CRUD (create/edit/delete companies), Interactions/timeline, the
  Dashboard, and everything in constitution non-goals (auth, email, LinkedIn, pipeline, etc.).
  Company records are consumed read-only here (from seed) so a contact can be linked to one.
- Why now: Contacts is the highest-priority slice (spec §20) and the thinnest end-to-end
  vertical that proves the agent-ready operating model produces a working, gated increment.

## Actors and boundaries

- Actors and authorization: a single unauthenticated user (MVP has no auth per C1). Every
  action is available to that user.
- Systems/data touched: Neon Postgres via Prisma; the `Company`, `Contact`, `Interaction`
  tables are created by the foundation migration. This slice writes `Contact`; reads `Company`;
  `Interaction` is created empty (used by a later slice) and is only touched by cascade-delete.
- Privacy/public-content constraints: no secrets in the repo; `DATABASE_URL` only via the
  Neon↔Vercel integration / gitignored `.env` (C1).
- Existing contracts that must remain stable: none published; the `/` starter page may be
  replaced by app navigation.
- Allowed file/module scope: `prisma/`, `src/lib/`, `src/app/contacts/`, `src/app/layout.tsx`,
  `src/components/contacts/`, `src/components/ui/`, `package.json` (scripts/deps for prisma/zod).
- Forbidden decisions or areas: no out-of-scope feature; no new runtime library beyond
  `prisma`, `@prisma/client`, `zod`; no invented status/interaction enum values (C1, spec §5).

## Acceptance criteria

Use observable language and link detailed scenarios from [given-when-then.md](given-when-then.md).

| ID | Observable behavior | Scenario | Required evidence |
|---|---|---|---|
| AC-1 | Creating a contact with a valid name persists it with default status `new` and it appears in the contacts list. | S-1 | `npm run test` (validation + action unit test); manual: contact visible in list |
| AC-2 | Submitting an invalid contact (empty name, malformed email, malformed LinkedIn URL, status outside the enum) is rejected with a field-level message and persists/changes nothing. | S-2 | `npm run test` (Zod schema rejects; action returns errors, no DB write); manual: error shown |
| AC-3 | The contacts list filters server-side by free-text name search and by status via query params `/contacts?search=&status=&company=`. | S-3 | `npm run test` (query builder maps params → where clause); manual: filtered rows |
| AC-4 | Opening a contact detail shows base fields, the linked company (or "no company"), status and next follow-up. | S-4 | manual on preview/dev; `npm run build` route compiles |
| AC-5 | Editing a contact — including changing status and setting `next_follow_up_at` — persists and is reflected in the detail and list. | S-5 | `npm run test` (update action); manual: updated values shown |
| AC-6 | Deleting a contact removes it from the list, its detail no longer resolves, and its interactions are also removed (cascade). | S-6 | `npm run test` (delete action + cascade); manual: gone from list |
| AC-7 | A contact can be created without a company; assigning an existing company links it and the detail shows that company. | S-7 | `npm run test` (nullable company); manual: both states |
| AC-8 | `npm run db:seed` populates sample companies/contacts/interactions (spec §15) and the seeded contacts appear in the list. | S-8 | `npm run db:seed` exit 0; manual: seeded rows in list |

## Failure and edge behavior

- Invalid input: name required (non-empty, trimmed); email must match an email format if given;
  `linkedin_url`/`website` must be a valid URL if given; status must be one of the enum
  (spec §5.2); invalid input returns field-level errors and writes nothing.
- Missing/duplicate/conflicting state: editing/deleting a non-existent contact id returns a
  not-found result, not a crash. Duplicate contacts are **allowed** in the MVP (no uniqueness
  constraint) — see Open decisions D-2.
- Authorization/ownership denial: N/A — single unauthenticated user (C1).
- External dependency failure: if the database is unreachable, actions fail with an error state
  and persist nothing; the process does not crash.
- Concurrency/time/locale considerations: `next_follow_up_at` is stored as a timestamp; date
  input is interpreted in **Europe/Budapest** (C1). "Overdue"/"this week" aggregation is a later
  (Dashboard) slice — not in scope here.
- State that must remain unchanged on failure: a rejected create/edit/delete leaves the persisted
  `Contact` rows exactly as before.

## Evidence required for done

- Automated tests and exact commands: `npm run typecheck && npm run lint && npm run test && npm run build` (all exit 0); Vitest covers validations, query filter building, and the create/update/delete actions.
- Manual verification: on the Vercel preview (or local `npm run dev`) exercise each AC's scenario and observe the stated result.
- Documentation/decision record: this package under `docs/spec-package/`; decisions in the log below and in `tasks.md`.
- Required independent reviewer roles: an independent fresh-context **reviewer agent** (a second harness — e.g. Codex — separate from the maker) per README maker/reviewer split.
- Evidence location: Linear `WEN-353` (Contacts) comments; git commit SHAs on `main`; Vercel deploy URL.

## Open decisions

Implementation cannot assume unresolved product behavior. Defaults below were set by the agent
under the product owner's lunchtime delegation (2026-07-14) and are marked for confirmation.

| Decision | Owner | Deadline | Options and observable impact | Status |
|---|---|---|---|---|
| D-1 Contact required fields | Csaba Piya | on return | Default: only `name` required; email/phone/linkedin optional. Alt: require ≥1 contact method. Impact: stricter create validation. | Assumed default — confirm |
| D-2 Duplicate contacts | Csaba Piya | on return | Default: allowed (no uniqueness). Alt: warn/block on same name+email. Impact: extra check on create. | Assumed default — confirm |
| D-3 Contact delete → interactions | Csaba Piya | on return | Default: cascade delete interactions (spec §14 `onDelete: Cascade`). Alt: block delete if interactions exist. Impact: AC-6 behavior. | Assumed default (matches spec §14) — confirm |
| D-4 Date input timezone | Csaba Piya | on return | Default: interpret follow-up dates in Europe/Budapest. Alt: UTC. Impact: which day a follow-up lands on. | Assumed default — confirm |

## Builder restatement

Before planning or editing, the builder restates:

- problem and observable outcome;
- every acceptance criterion (AC-1…AC-8);
- in-scope/out-of-scope and stable contracts;
- unresolved decisions (D-1…D-4 and their assumed defaults);
- planned evidence (the exact commands above).

Mismatch returns to specification; it is not corrected only in chat.

## Human spec gate

Gate verdict: **APPROVED** _(prepared under product-owner delegation 2026-07-14; Csaba Piya to confirm on return)_

- Contract version approved: C3 / contacts-slice v1
- Approved by: Csaba Piya (product owner) — delegated preparation to agent; confirmation pending
- Approved at: 2026-07-14 (provisional)
- Remaining owned risks: open decisions D-1…D-4 stand on assumed defaults until confirmed.
- Next action: product-owner confirms C3 (and D-1…D-4), then the plan gate (P1) and maker launch.

The handoff is `C3-APPROVED-CONTRACT` only when the verdict is `APPROVED`, every
acceptance criterion has evidence, and no ownerless product decision remains.
