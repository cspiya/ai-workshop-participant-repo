<!-- BEGIN:nextjs-agent-rules -->
# Next.js: always read the version-matched docs before coding

Before any Next.js work, find and read the relevant documentation in
`node_modules/next/dist/docs/`. The installed documentation is the source of
truth for this project's Next.js version.
<!-- END:nextjs-agent-rules -->

# Agent rules

**Mini CRM** — a lightweight contact & relationship manager for personal /
direct business outreach, built with AI-assisted development
(Next.js App Router + TypeScript + Tailwind + shadcn/ui + Postgres).

The full product specification is the source of truth for WHAT to build:
[`docs/mini-crm-projektleiras.md`](docs/mini-crm-projektleiras.md).
The phased delivery plan (spec → implement → deploy) is
[`docs/implementation-plan.md`](docs/implementation-plan.md).
Work is tracked in Linear (project `ai-workshop-participant-repo`); the Linear
issue is the executable slice, the spec is the contract.

## What the app does (scope summary)

Three entities and their CRUD, plus a dashboard:

- **Company** `1 ── N` **Contact** `1 ── N` **Interaction**.
- A Contact may exist without a Company.
- Pages: Dashboard, Contacts (list/search/filter, new, detail, edit),
  Companies (list, new, detail, edit), Interaction timeline on the contact
  detail page.
- MVP acceptance criteria live in §16 of the spec; the build is a working
  **vertical slice** at every step, never many half-finished features.

Explicitly out of MVP scope (spec §17): auth/multi-user, SSO, email sending,
LinkedIn integration, full sales pipeline, deals, campaigns, file upload, AI
assistant, complex reports, audit log. Do not build these unless the spec is
amended.

## Locked technical decisions

These resolve the spec's open "X or Y" choices. Treat them as the contract; a
change is a human decision recorded here.

| Concern | Decision |
|---|---|
| Database | **Neon Postgres** (project `ai-workshop-participant-repo`) — one DB for local dev and deploy; branch per PR. |
| ORM | **Prisma** (`prisma`, `@prisma/client`). Schema in `prisma/schema.prisma`; Int autoincrement ids per spec §14. |
| Validation | **Zod** — one schema per entity in `src/lib/validations.ts`, shared by server and client. |
| Mutations | **Server Actions** in `src/lib/actions.ts` (App Router); revalidate affected paths. |
| Reads | React Server Components + query helpers in `src/lib/queries.ts`. |
| Forms | Native `<form>` + `useActionState`. Add React Hook Form only if a screen's UX truly needs client-side field state. |
| Search/filter | Server-side via query params (spec §10), e.g. `/contacts?search=&status=&company=`. |
| Secrets | `DATABASE_URL` lives in `.env` (gitignored). Never commit it; pull the Neon connection string via MCP when needed. |

## Rules

1. Follow `DESIGN-GUIDELINE.md` for anything visual.
2. UI building blocks come from `src/components/ui/` (shadcn/ui — local source,
   you may edit it). Add new ones with `npx shadcn@latest add <component>`.
3. Keep it simple: no new libraries, patterns, or abstractions unless the task
   truly needs them. One implementation ⇒ no interface. The libraries approved
   for this project are listed in "Locked technical decisions" above
   (`prisma`, `@prisma/client`, `zod`); anything beyond them needs human sign-off.
4. Code, comments, and commit messages are English.
5. Every change is a vertical slice behind the CI gates. Before declaring any
   task done, run and fix until green:
   `npm run typecheck && npm run lint && npm run test && npm run build`
6. Data-layer rules: validate every mutation input with the entity's Zod schema
   before touching the DB; enum values (ContactStatus, InteractionType) come
   from the spec (§5.2, §5.3) — never invent new ones.
7. One slice ⇒ one PR ⇒ one Linear issue. A slice is done only when its spec
   acceptance criteria are demonstrably met and the gates are green.

> This file grows during the workshop — every recurring correction you give
> the agent belongs here as a rule.
