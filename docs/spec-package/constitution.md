# Project constitution

This file records invariants that every feature specification, plan, task, and implementation
must obey. Keep it short, versioned, and owned. A feature cannot silently override it.

## Identity and mission

- Product/repository mission: **Mini CRM** — a lightweight contact & relationship manager for
  personal / direct business outreach. In this workshop it is the realistic validation workload
  for an agent-ready engineering operating model (the method is the real subject; the feature is
  the vehicle).
- Primary users and outcomes: SMB owners, consultants, salespeople, business-development and
  recruiter/partner roles — track companies, contacts and interactions, set follow-ups, and see
  upcoming/overdue follow-ups on a dashboard (spec §3, §4).
- Explicit non-goals (spec §17): multi-user auth, Google/Microsoft SSO, automated email,
  LinkedIn integration, full sales pipeline, deal/quote management, campaigns, file upload,
  AI assistant, complex reports, audit log.

## Non-negotiable boundaries

- Allowed modules/data: `src/app/`, `src/components/`, `src/lib/`, `prisma/`; the
  `Company` / `Contact` / `Interaction` entities and their fields per spec §5.
- Forbidden modules/data: any out-of-scope feature above; editing the read-only workshop
  source (`../workshop-source`); new runtime libraries beyond the approved set.
- Stable public contracts: none published yet (single deployable app, no external API/consumers).
  `N/A` until a contract is published; introducing one is a `Scope change`.
- Authorization and privacy invariants: single-user MVP, no authentication; **no secrets in the
  repository**; database credentials only via the Neon↔Vercel integration env (deployed) or a
  gitignored local `.env` (never committed).
- Public-repository hygiene: the GitHub repo is **public**; `.env*` is gitignored (except
  `.env.example`); never commit tokens, connection strings, or personal data.
- Supported compatibility/locale/time assumptions: Next.js 16 (App Router) + React 19 +
  TypeScript; Node 22 in CI. User-facing dates assume **Europe/Budapest**; the precise
  "overdue" / "due this week" follow-up semantics are product behavior and are owned at the
  spec gate (`DECISION REQUIRED` there), not decided here.

## Canonical standards and real gates

- Repository instructions: [`AGENTS.md`](../../AGENTS.md) (loaded via `CLAUDE.md`).
- Engineering standard: `AGENTS.md` → "Locked technical decisions" + Rules 1–8
  (Neon Postgres + Prisma + Zod + Server Actions; vertical slices; pre-production direct-to-`main`).
- Required check commands:
  - Format/lint: `npm run lint`
  - Type/build: `npm run typecheck` and `npm run build`
  - Unit/contract/integration: `npm run test` (Vitest)
  - End-to-end/manual: manual verification on the Vercel preview/production URL; automated e2e
    is `N/A` for the MVP (not yet configured).
  - Security/public-content: no secret in the working tree — `git status --porcelain` clean of
    `.env`; secrets provided only via env/integration. No dedicated scanner script yet (`N/A`);
    enforced by `.gitignore` + review.
- Evidence location: Linear issues `WEN-351…WEN-357` (comments) + git commit SHAs on `main` +
  Vercel deployment URLs; spec-gate artifacts live under `docs/spec-package/`.

## Decision authority

| Decision type | Human owner | Agent may decide? | Escalation path |
|---|---|---|---|
| Product behavior | Csaba Piya (product owner) | no | `DECISION REQUIRED` |
| Architecture inside approved boundaries | Csaba Piya | with evidence | review |
| Security/privacy exception | Csaba Piya | no | stop and escalate |
| Scope change | Csaba Piya | no | return to spec gate |

## Change control

- Constitution version: **C1**
- Approved by: _pending — Csaba Piya (product owner)_
- Approved at: _pending_
- Next review: 2026-07-14 (end of workshop day)
- Supersedes: none (first version)

A feature that conflicts with this constitution is `BLOCKED` until a human owner changes
the constitution or the feature. The implementation agent must not invent an exception.

## Constitution gate

- [x] Mission and non-goals are explicit.
- [x] Boundaries and stable contracts are named.
- [x] Real check commands and evidence location are known.
- [x] Decision owners are named.
- [x] No unresolved contradiction exists.
- [ ] Human approval, version, and timestamp are recorded. _(awaiting product-owner sign-off)_
