# Mini CRM — implementációs terv (spec → implementálás → deploy)

Ez a terv a [`docs/mini-crm-projektleiras.md`](mini-crm-projektleiras.md) specifikációt
viszi végig működő, deployolt alkalmazásig. Minden szakasz egy **vertikális szelet**:
önállóan fejleszthető, a CI-kapukon átmenő, PR-ként review-zható, egy Linear-issue-hoz
kötött egység. A sorrend a spec §20 prioritását követi.

## Alapelvek

- **Egy szelet ⇒ egy PR ⇒ egy Linear-issue.** Kis kontextus, kis hibaterjedés.
- **Kapuk minden PR-en:** `npm run typecheck && npm run lint && npm run test && npm run build`
  (CI: `.github/workflows/ci.yml`), plusz Neon DB-branch + Vercel preview a PR-hez.
- **Spec = szerződés.** Egy szelet akkor kész, ha a spec vonatkozó acceptance
  kritériuma (§16) igazolható és a kapuk zöldek.
- **Rögzített stack** (lásd `AGENTS.md`): Next.js App Router + TS + Tailwind +
  shadcn/ui, **Neon Postgres + Prisma + Zod + Server Actions**.

## Rögzített technikai döntések

| Terület | Döntés | Indok |
|---|---|---|
| Adatbázis | Neon Postgres (`ai-workshop-participant-repo`) | Már provisionálva; DB-branch PR-enként; publikus demóhoz Postgres kell (spec §12). |
| ORM | Prisma | A spec §14 konkrét Prisma-modellt ad; erős a tanítókorpuszban. |
| Validáció | Zod | Egy séma szerver+kliens oldalon (spec §11, §12). |
| Mutációk | Server Actions | App Router-natív, kevesebb boilerplate, mint külön REST route-ok. |
| Űrlapok | natív `<form>` + `useActionState` | Kevesebb függőség (rule 3); RHF csak ha egy képernyő tényleg igényli. |

## Fázisok

### F0 — Előfeltételek (ember + agent, kód még nincs)
- Vercel-projekt bekötése a repóhoz (git-linkelt import → PR-preview). *(nyitott emberi döntés)*
- `DATABASE_URL` a `.env`-be (Neon connection string; gitignore-olt).
- **Kimenet:** deploy-lánc kész, secret a helyén. **Kapu:** ember jóváhagyja a bootstrap-evidenciát.

### F1 — Adatréteg + alaplayout  *(spec §5, §6, §13, §14, §15)*
- Prisma bekötése, `prisma/schema.prisma`: `Company`, `Contact`, `Interaction` + `ContactStatus`, `InteractionType` enumok.
- Első migráció a Neon ellen; `src/lib/db.ts` (Prisma singleton).
- `prisma/seed.ts` a spec §15 mintaadataival; `npm run db:seed`.
- App-shell: navigáció (Dashboard / Contacts / Companies), üres route-ok.
- **Acceptance:** migráció lefut, `db:seed` feltölt, a nav minden oldalt elér.

### F2 — Contacts vertikális szelet  *(spec §5.2, §7.2, §8.2–8.4, §10, §11)*
- Lista keresés/szűrés/rendezés query-paraméterrel (`/contacts?search=&status=&company=`).
- Új kapcsolattartó űrlap (Zod-validáció, státusz alapból `new`).
- Adatlap: alapadatok, cég, státusz, következő utánkövetés, (interakció-idővonal helye).
- Szerkesztés, törlés, státuszváltás, `next_follow_up_at` beállítása.
- **Acceptance:** Contact CRUD + szűrés (név/státusz) + validációs üzenetek működnek.

### F3 — Companies vertikális szelet  *(spec §5.1, §7.1, §8.5, §8.6, §11)*
- Lista (név, iparág, kapcsolattartók száma, weboldal).
- Új cég, adatlap a hozzá tartozó kapcsolattartókkal, „új kapcsolattartó ehhez a céghez".
- Szerkesztés, törlés (FK-viselkedés tisztázva: contact company nélkül is létezhet).
- **Acceptance:** Company CRUD; contact céghez rendelhető; cég adatlap listázza a kontaktjait.

### F4 — Interactions  *(spec §5.3, §7.3, §8.4, §9, §11)*
- Interakció rögzítése a contact adatlapján (típus, tárgy, notes kötelező, `happened_at`).
- Időrendi idővonal; törlés. (Szerkesztés opcionális — spec §7.3.)
- **Acceptance:** interakció rögzíthető és megjelenik az idővonalon; validáció él.

### F5 — Dashboard  *(spec §8.1)*
- Kártyák: aktív kapcsolatok, új kapcsolatok, e heti esedékes utánkövetések, elmaradt utánkövetések, aktív egyeztetések.
- Listák: következő utánkövetések, legutóbbi interakciók, válaszra váró kapcsolatok.
- **Acceptance:** a dashboard a seed-adatokon helyes közelgő/elmaradt utánkövetéseket mutat.

### F6 — Minőség + deploy  *(spec §7 minőség, §16, §12 deployment)*
- Validációs üzenetek, loading/empty state-ek, a11y + reszponzivitás (DESIGN-GUIDELINE).
- Értelmes tesztek a queries/actions/validations köré (Vitest).
- Production deploy Vercelre; `DATABASE_URL` a Vercel env-be; migráció a production DB-n.
- **Acceptance:** az MVP §16 minden pontja teljesül; az app lokálisan és deployolt környezetben is fut.

## Folyamat egy szeleten belül (a workshop operating modellje)

1. **Spec-kapu** — a szelet acceptance kritériumát az emberrel egyeztetve rögzítjük (issue = spec).
2. **Design** (ahol UI van) — DESIGN-GUIDELINE tokenek alapján, v0/Claude Design; ember jóváhagy.
3. **Implementálás** — maker agent a jóváhagyott scope-on belül; Zod-validáció, Server Actions.
4. **Kapuk** — typecheck/lint/test/build lokálisan zöld, majd CI a remote-on.
5. **Preview** — Neon DB-branch + Vercel preview URL a PR-en; élő ellenőrzés.
6. **Független review (RUG)** — külön nézőpont a diffre és az evidenciára; blokkolhat merge-öt.
7. **Merge** — ember hagyja jóvá; a slice működő vertikális szeletként landol.

## Sorrend és függőségek

```text
F0 ─▶ F1 ─┬▶ F2 (Contacts) ─┬▶ F4 (Interactions) ─▶ F5 (Dashboard) ─▶ F6 (Deploy)
          └▶ F3 (Companies) ─┘
```

F1 mindennek előfeltétele. F2 és F3 F1 után párhuzamosítható (két agent);
F4 a Contact + Company szeletre épül; F5 az összes entitás adatára; F6 zár.

## Következő emberi döntés
Az F0 két nyitott pontja: (1) a Vercel-projekt git-linkelt bekötésének módja
(dashboard-import vs. CLI), és (2) a `DATABASE_URL` bevitele a `.env`-be. Amint
ezek megvannak és az F1 spec-kapuját elfogadod, az F1 (adatréteg) indulhat.
