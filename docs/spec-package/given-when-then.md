# Given–When–Then scenarios

Business intent is agreed in Hungarian; the executable contract is recorded in English.
Every acceptance criterion in [spec.md](spec.md) has at least one observable scenario below.

## HU intent (BA)

**Magyar szándék:** A felhasználó tudjon kapcsolattartót felvenni (névvel, opcionális
adatokkal), a listában név és státusz szerint keresni/szűrni, megnyitni az adatlapot,
szerkeszteni (státusz és következő utánkövetés is), és törölni. Hibás adatnál érthető
üzenet jöjjön, és semmi ne mentődjön. A kapcsolattartó cég nélkül is létrehozható.

## Scenarios

### S-1 — create a valid contact (AC-1)

- **Given** the contacts feature is available and the database is reachable
- **When** the user submits a new contact with name "Anna Kovács" and no other required field
- **Then** a `Contact` is persisted with status `new`
- **And** "Anna Kovács" appears in the contacts list

### S-2 — invalid contact is rejected (AC-2)

- **Given** the new-contact form
- **When** the user submits an empty name (or `email = "not-an-email"`, or `linkedin_url = "x"`, or a status not in the enum)
- **Then** the request is rejected with a field-level validation message
- **And** no `Contact` row is created or changed

### S-3 — server-side search and filter (AC-3)

- **Given** contacts "Anna Kovács" (`contacted`) and "Péter Nagy" (`new`) exist
- **When** the user requests `/contacts?search=anna&status=contacted`
- **Then** the list contains "Anna Kovács"
- **And** the list does not contain "Péter Nagy"

### S-4 — view contact detail (AC-4)

- **Given** a contact linked to company "Acme Logistics" with status `contacted`
- **When** the user opens that contact's detail page
- **Then** the page shows the base fields, "Acme Logistics" as the company, the status, and the next follow-up (or "none")

### S-5 — edit status and follow-up (AC-5)

- **Given** an existing contact with status `new` and no follow-up date
- **When** the user edits it to status `meeting_scheduled` and sets `next_follow_up_at` to a future date
- **Then** the changes are persisted
- **And** the detail and the list row reflect the new status and follow-up date

### S-6 — delete a contact cascades interactions (AC-6)

- **Given** a contact that has two interactions
- **When** the user deletes the contact
- **Then** the contact no longer appears in the list and its detail no longer resolves
- **And** its two interactions are also removed

### S-7 — contact without a company, then linked (AC-7)

- **Given** the new-contact form
- **When** the user creates a contact with no company selected
- **Then** the contact is created and its detail shows "no company"
- **And** when the user later edits it to select the existing company "GreenTech Solutions"
- **Then** the detail shows "GreenTech Solutions"

### S-8 — seed populates sample data (AC-8)

- **Given** an empty database after migration
- **When** `npm run db:seed` is run
- **Then** the command exits 0
- **And** the seeded sample contacts (spec §15) appear in the contacts list

## Evidence mapping

| Scenario | AC | Automated evidence (exact command) | Manual evidence | Boundary / unchanged-state |
|---|---|---|---|---|
| S-1 | AC-1 | `npm run test` — create action persists, default status `new` | contact visible in list | name = 1 char (min valid) |
| S-2 | AC-2 | `npm run test` — Zod rejects; action returns errors, asserts 0 DB writes | error message shown | empty name; `a@b` boundary; unchanged rows on failure |
| S-3 | AC-3 | `npm run test` — query builder maps `search`/`status`/`company` → Prisma where | filtered list | empty search returns all; unknown status = no rows |
| S-4 | AC-4 | `npm run build` compiles `/contacts/[id]` | detail shows fields + company/none | company null → "no company" |
| S-5 | AC-5 | `npm run test` — update action persists status + follow-up | detail/list updated | follow-up in the past still savable |
| S-6 | AC-6 | `npm run test` — delete removes contact and cascades interactions | gone from list | deleting missing id → not-found, no crash |
| S-7 | AC-7 | `npm run test` — company_id nullable; link/unlink | both states shown | company optional |
| S-8 | AC-8 | `npm run db:seed` exit 0 | seeded rows in list | idempotent re-run behavior noted in tasks |

One `When` per scenario keeps failures diagnosable. Negative paths (S-2, and the missing-id
note in S-6) assert that persisted state is unchanged on failure.
