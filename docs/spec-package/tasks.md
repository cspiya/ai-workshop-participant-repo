# Task breakdown

Required input: approved spec and plan versions. Tasks must be independently verifiable,
small enough to review, and assigned exclusive file/module ownership where parallel work is used.

## Input versions

- Constitution: C1 ([constitution.md](constitution.md))
- Spec: C3 / contacts-slice v1 ([spec.md](spec.md))
- Plan: P1 ([plan.md](plan.md))
- Human approval evidence: APPROVED by Csaba Piya (product owner) 2026-07-14.

## Ordered tasks

| ID | Task/outcome | Exclusive scope | Accountable owner | Depends on/order | AC IDs | Exact verification command | Evidence location | Status |
|---|---|---|---|---|---|---|---|---|
| T0 | Builder restatement of C3 + P1 (problem, AC-1…AC-8, scope, D-1…D-4 defaults, planned evidence) before any edit | none (write-up) | Maker | — | all | n/a (restatement reviewed by owner) | WEN-353 comment | not-started |
| T1 | Data foundation: prisma deps, `prisma/schema.prisma`, `src/lib/db.ts`, `package.json` scripts + `postinstall` | `prisma/`, `src/lib/db.ts`, `package.json` | Maker | T0 | AC-6,AC-7,AC-8 | `npx prisma migrate dev --name init` (exit 0) → `npm run build` | commit SHA + migration file | not-started |
| T2 | Seed `prisma/seed.ts` (spec §15) | `prisma/seed.ts`, `package.json` | Maker | T1 | AC-8 | `npm run db:seed` (exit 0) | command output in WEN-353 | not-started |
| T3 | Zod schemas `src/lib/validations.ts` + unit tests | `src/lib/validations.ts`, `*.test.ts` | Maker | T1 | AC-1,AC-2,AC-7 | `npm run test` | test output | not-started |
| T4 | Queries `src/lib/queries.ts` (list filter/search, getContact) + tests | `src/lib/queries.ts`, `*.test.ts` | Maker | T1 | AC-3,AC-4 | `npm run test` | test output | not-started |
| T5 | Actions `src/lib/actions.ts` (create/update/delete + revalidate) + tests | `src/lib/actions.ts`, `*.test.ts` | Maker | T3,T4 | AC-1,AC-2,AC-5,AC-6 | `npm run test` | test output | not-started |
| T6 | UI: nav + `src/app/contacts/**` + `src/components/contacts/**` | `src/app/layout.tsx`, `src/app/contacts/**`, `src/components/contacts/**` | Maker | T5 | AC-1…AC-7 | `npm run build`; manual on preview/dev | Vercel URL + notes | not-started |
| T7 | Full gate + manual walkthrough of S-1…S-8 | none (verify) | Maker | T2,T6 | all | `npm run typecheck && npm run lint && npm run test && npm run build` | exit codes in WEN-353 | not-started |
| T8 | Independent fresh-context review (correctness, scope, AC coverage, no secret) | read-only review | Reviewer | T7 | all | reviewer re-runs full gate | review findings in WEN-353 | not-started |
| T9 | Bounce-back: fix accepted findings, re-verify | scope of the finding | Maker | T8 | affected AC | re-run affected checks + full gate | commit SHA + re-verify output | not-started |

## Per-task execution contract

Before editing, the builder:

1. restates the linked ACs and scope;
2. reads repository instructions (`AGENTS.md`) and canonical standard (C1);
3. reports `DECISION REQUIRED` rather than inventing behavior (D-1…D-4 already have owned defaults);
4. runs the named checks and records command, exit code, and relevant output;
5. hands the artifact and evidence to an independent fresh-context review.

A task is done only when its ACs pass, accepted findings are fixed and re-verified, and
remaining risk has a human owner.

## Acceptance coverage matrix

Every acceptance criterion has at least one owned task, explicit dependency/order, an exact
command, and an evidence location.

| AC ID | Scenario(s) | Owned task(s) | Dependencies/order | Exact check | Evidence location | Verdict |
|---|---|---|---|---|---|---|
| AC-1 | S-1 | T3,T5,T6 | T1→T3→T5→T6 | `npm run test`; manual S-1 | test output + list | pending |
| AC-2 | S-2 | T3,T5 | T1→T3→T5 | `npm run test` (reject + no write) | test output | pending |
| AC-3 | S-3 | T4,T6 | T1→T4→T6 | `npm run test` (filter mapping); manual S-3 | test output + list | pending |
| AC-4 | S-4 | T4,T6 | T1→T4→T6 | `npm run build`; manual S-4 | build + detail page | pending |
| AC-5 | S-5 | T5,T6 | T5→T6 | `npm run test` (update); manual S-5 | test output + detail | pending |
| AC-6 | S-6 | T1,T5 | T1→T5 | `npm run test` (delete + cascade) | test output | pending |
| AC-7 | S-7 | T1,T3,T6 | T1→T3→T6 | `npm run test` (nullable company); manual S-7 | test output + detail | pending |
| AC-8 | S-8 | T1,T2 | T1→T2 | `npm run db:seed` (exit 0); manual list | command output + list | pending |

## RUG execution and closed-gate handoff

- Builder restatement task: **T0** (Maker).
- Independent fresh-context reviewer task: **T8** (Reviewer — a second harness, e.g. Codex, with no maker context).
- Accepted-finding bounce-back owner/task: **T9** (Maker).
- Re-verification command and evidence location: `npm run typecheck && npm run lint && npm run test && npm run build` → exit codes + Vercel URL in `WEN-353`.
- Closed-spec-gate packet location: `docs/spec-package/` + this file; handoff summary in `WEN-353`.
- Statement that feature implementation has not started: **No feature implementation has started; feature files are unchanged (only `docs/spec-package/` and `AGENTS.md`).**

### Maker launch prompt (paste to the maker harness after human APPROVED)

```text
Read AGENTS.md and docs/spec-package/ (constitution C1, spec C3, given-when-then, plan P1,
tasks). Restate the problem, AC-1..AC-8, scope, and decisions D-1..D-4 (T0). Then implement
tasks T1..T7 in order, one vertical slice for the Contacts feature. Follow the locked stack
(Neon Postgres + Prisma + Zod + Server Actions). Do not exceed the file scope in plan.md and
do not build Companies CRUD, Interactions, or the Dashboard. Run the full gate
(typecheck && lint && test && build) and fix until green before pushing to main
(pre-production rule 8). Record command exit codes and the Vercel URL in Linear WEN-353. Do
not self-approve any gate; hand off to the reviewer.
```

### Reviewer launch prompt (paste to the independent reviewer harness)

```text
Fresh context. Review the Contacts slice against docs/spec-package/spec.md (AC-1..AC-8) and
plan.md. Verify: every AC is met with the stated evidence; no scope creep beyond plan.md;
no secret or DATABASE_URL committed; Zod validation guards every mutation; enum values match
spec §5. Re-run typecheck && lint && test && build yourself. Report findings as CONFIRMED or
PLAUSIBLE with a failing scenario each; do not fix — hand accepted findings back to the maker
(T9).
```

- [x] Every AC appears in the coverage matrix.
- [x] Every task has exactly one accountable owner and exclusive scope.
- [x] Dependencies and execution order are explicit, including review and bounce-back.
- [x] Every check is an executable command, not a generic test label.
- [x] Every evidence location is named before work starts.
- [x] No unresolved decision or instructional placeholder remains; D-1…D-4 carry owned defaults; `N/A` items include a reason.
- [x] Approved constitution, spec, and plan versions are recorded (C1 / C3 / P1, Csaba Piya, 2026-07-14).
- [x] A human has approved entry into the later implementation phase (Csaba Piya, 2026-07-14).

## Decision and deviation log

| Decision/deviation | Owner | Options/impact or reason | Outcome | Evidence |
|---|---|---|---|---|
| D-1 required fields | Csaba Piya | only `name` required vs require ≥1 contact method | default: name only | spec.md Open decisions |
| D-2 duplicates | Csaba Piya | allow vs warn/block on name+email | default: allow | spec.md Open decisions |
| D-3 delete cascade | Csaba Piya | cascade interactions vs block delete | default: cascade (spec §14) | spec.md + schema |
| D-4 date timezone | Csaba Piya | Europe/Budapest vs UTC | default: Europe/Budapest | constitution C1 |
| Scope of package | Csaba Piya | Contacts slice only (Companies/Interactions/Dashboard later) | agreed | spec.md scope note |

## Common failures and Plan B

- **Hidden shared-file overlap:** the slice is single-maker; if parallelized, re-slice ownership before parallel edits.
- **Task exposes a product gap:** mark `BLOCKED` and return to the spec gate (owner Csaba Piya).
- **Configured check is unavailable** (e.g. Neon shadow-DB for `migrate dev`): record the failure; use `prisma migrate deploy` with a hand-authored migration as the agreed fallback — do not claim the original check passed.
- **Plan no longer fits the code:** document evidence and request plan re-approval; do not silently expand scope.
