# Implementation plan

Required input: approved `C3-APPROVED-CONTRACT` and constitution version. Stop if either
is missing, stale, or contradictory.

## Input contract

- Spec ID/version: C3 / contacts-slice v1 ([spec.md](spec.md))
- Constitution version: C1 ([constitution.md](constitution.md))
- Approval evidence: spec gate APPROVED by Csaba Piya (product owner) 2026-07-14
- Acceptance criteria covered: AC-1 … AC-8
- Scope/file ownership: `prisma/`, `src/lib/`, `src/app/contacts/`, `src/app/layout.tsx`, `src/components/contacts/`, `package.json`
- Canonical engineering standard: `AGENTS.md` (Neon Postgres + Prisma + Zod + Server Actions; vertical slice; pre-production direct-to-`main`)

## Current-state evidence

- Relevant entry points: `src/app/layout.tsx`, `src/app/page.tsx` (starter "It works!"), `src/lib/utils.ts`, `src/components/ui/{button,card}.tsx`.
- Existing tests/contracts: one Vitest smoke test (`src/lib/utils.test.ts`); no DB layer yet (`get_database_tables` = empty).
- Constraints discovered: Prisma not installed; `DATABASE_URL` supplied at runtime by the Neon↔Vercel integration (deployed) — local migration/seed use the Neon connection string inline (never committed).
- Exact check commands confirmed: `npm run typecheck` / `npm run lint` / `npm run test` / `npm run build` (all currently green); `npm run db:seed` to be added.
- Plan assumptions that require validation: Prisma client generation must run in the Vercel build (`postinstall: prisma generate`); Prisma `migrate dev` shadow-DB works on Neon with `neondb_owner`.

## Smallest complete slice

| Step | Change and files/modules | Acceptance criteria | Verification | Owner |
|---|---|---|---|---|
| 1 | Data foundation: add `prisma`+`@prisma/client`; `prisma/schema.prisma` (Company/Contact/Interaction + `ContactStatus`,`InteractionType` enums, Int ids, `Interaction.contactId onDelete: Cascade`, `Contact.companyId` nullable); `src/lib/db.ts` singleton; `package.json` scripts (`db:migrate`,`db:seed`,`postinstall: prisma generate`) | AC-6, AC-7, AC-8 (foundation) | `npx prisma migrate dev --name init` applies; `npm run build` | Maker |
| 2 | Seed: `prisma/seed.ts` with spec §15 sample companies/contacts/interactions | AC-8 | `npm run db:seed` exit 0 | Maker |
| 3 | Validation: `src/lib/validations.ts` — Zod `contactCreateSchema`/`contactUpdateSchema` (name required; email/url format; status enum; nullable company) | AC-1, AC-2, AC-7 | `npm run test` (schema unit tests) | Maker |
| 4 | Reads: `src/lib/queries.ts` — `listContacts({search,status,company})` builds Prisma where server-side; `getContact(id)` | AC-3, AC-4 | `npm run test` (filter mapping) | Maker |
| 5 | Mutations: `src/lib/actions.ts` — `createContact`/`updateContact`/`deleteContact` Server Actions; validate via Zod, `revalidatePath` | AC-1, AC-2, AC-5, AC-6 | `npm run test` (action behavior + no-write-on-invalid + cascade) | Maker |
| 6 | UI: `src/app/layout.tsx` nav (Dashboard/Contacts/Companies); `src/app/contacts/{page,new/page,[id]/page,[id]/edit/page}.tsx`; `src/components/contacts/*`; a company selector populated from seeded companies | AC-1…AC-7 | `npm run build`; manual on preview/dev | Maker |
| 7 | Independent review (fresh context) + bounce-back fixes + re-verify | all | full gate re-run + manual | Reviewer → Maker |

## Architecture and data impact

- Boundary/dependency direction: UI (RSC/actions) → `lib` (queries/actions/validations) → `db` (Prisma) → Neon. No dependency the other way.
- Stable contracts preserved: none published; the `/` starter page is replaced by app nav (allowed).
- Schema/migration impact: first migration creates all three tables + enums. `Interaction` created but only cascade-touched in this slice.
- Authorization/privacy impact: none (single user, no auth); no secret committed.
- Compatibility/locale/time impact: dates interpreted Europe/Budapest (C1); no aggregation here.

## Risks, alternatives, and rollback

- Chosen approach and why: Prisma + Server Actions per C1 — smallest idiomatic App Router path; matches spec §14 concrete model.
- Alternative rejected and why: Drizzle (spec allows) — rejected to match the spec's concrete Prisma model and reduce ambiguity; REST route handlers — rejected, Server Actions are less boilerplate.
- Risk / mitigation: Prisma client not generated in Vercel build → add `postinstall: prisma generate`; Neon shadow-DB for `migrate dev` → if it fails, use `prisma migrate deploy` with a hand-authored migration (record the fallback, do not claim the original passed).
- Safe rollback/reversal: revert the slice commit(s) on `main`; the migration is additive (new tables) and can be dropped on the Neon branch.
- Residual risk requiring human ownership: open decisions D-1…D-4 (spec) on assumed defaults until confirmed.

## Plan gate and handoff

- [x] Spec and constitution versions are approved (C1 and C3, Csaba Piya, 2026-07-14).
- [x] Plan does not add product behavior.
- [x] Scope and exclusive file ownership are agreed.
- [x] Every AC maps to a change and evidence.
- [x] Actual check commands are identified.
- [x] Reviewer roles are selected (independent fresh-context reviewer agent).
- [x] Human approved the plan or recorded an owned exception (Csaba Piya, 2026-07-14).
- [x] Every instructional placeholder is replaced, removed, or recorded as `N/A` with reason.

- Plan verdict: **APPROVED**
- Approved by/at: Csaba Piya / 2026-07-14
- Plan version: **P1**
- Output plan version for [tasks.md](tasks.md): **P1-APPROVED-PLAN**

Tasks may be generated only when the verdict is `APPROVED`, the plan version is recorded,
and approval evidence names the human approver and timestamp.
