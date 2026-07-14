# 01 — Helyzetkép (repó-diagnózis)

**Dátum:** 2026-07-14 · **Repó:** `c:\zulu\ai-workshop\participant-repo` · **Módszer:** csak olvasás, kód nem módosult.

## Mi ez, és milyen állapotban van

- **Technikai hordozó, nem agent-ready rendszer.** Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui minimál starter. Ezt a `README.md` explicit kimondja: „még **nem** agent-ready fejlesztési rendszer, csak a technikai hordozója".
- **Bootstrap frissen kimásolva.** `.workshop-bootstrap.json` szerint a `participant-starter`-ből 2026-07-14 09:50-kor jött létre. A függőségek telepítve (`node_modules` megvan), a build legalább egyszer lefutott (`tsconfig.tsbuildinfo` jelen van).
- **Verziózatlan.** `git`: nincs commit, nincs remote, minden fájl `untracked`. A `main` ág üres.
- **CI kész, de inaktív.** `.github/workflows/ci.yml` (typecheck → lint → test → build) létezik, de amíg nincs GitHub-remote és push, nem fut.
- **`gh` CLI hitelesítve** `cspiya` névvel, `repo` + `workflow` scope-pal — az agent tud repót létrehozni és pusholni.
- **App-tartalom placeholder.** `src/app/page.tsx` az „It works!" demólap; `layout.tsx` metaadata „My Website"; egyetlen smoke-teszt (`src/lib/utils.test.ts`).

## Legalább három hiányzó információ

1. **Nincs saját, írható GitHub-repó (remote/commit/láthatóság).** A bootstrap kimásolt, de a verziózás nem történt meg. Ismeretlen: a **repónév**, a **láthatóság** (private/public), és hogy induljon-e branch-védelem. Enélkül nincs hová pusholni, és a CI-kapuk némák maradnak.
2. **Nincs jóváhagyott spec-csomag** (`docs/spec/` nem létezik) a nap munkadarabjához, a **KK-Regisztrációhoz**. A WHAT nincs rögzítve: a 48 órás **kizáró** lemondási határ pontos szemantikája és a **duplikátum-védelem** kritériuma nincs gépileg ellenőrizhető formában. (README: „Feature csak az ember által elfogadott bootstrap-evidence után indulhat.")
3. **Az MCP-szolgáltatások auth-állapota ismeretlen.** `.mcp.json` bekötve (`linear`, `github`, `neon`, `vercel`), de a Linear/Neon/Vercel csak első használatkor (`/mcp`) OAuth-ozik böngészőben; a GitHub MCP nem OAuth-ol, helyette `gh` CLI. Nem tudjuk, melyik szolgáltatás él ténylegesen.
4. **A `DESIGN-GUIDELINE.md` értékei üresek** — brand/tone, színek, tipográfia, layout mind placeholder. A „HOGYAN nézzen ki" döntés nyitott.
5. **Az `AGENTS.md` csak vázas működési szerződés.** Hiányzik a kanonikus mérnöki standard, a DoD/Definition of Done, a spec-kapu és a független review (RUG) orkesztrációja — a mechanikus kapukon (`typecheck`/`lint`/`test`) túl nincs bekötve az operating model.
6. **Adatbázis-réteg még nincs.** `.env` üres, `DATABASE_URL` szándékosan a nap későbbi blokkjában kerül be — most nincs perzisztencia.

## Döntési határ: modell / agent / ember

| Szereplő | Mit tesz | Hol a határa |
|---|---|---|
| **Modell** (LLM: Opus/Codex) | Szöveg- és kódgenerálás: spec-fogalmazvány, diff-javaslat, magyarázat, elemzés. | Nincs oldalhatás-felelőssége. **Nem** dönt scope-ról, **nem** választ üzleti szemantikát, **nem** hagy jóvá. Kimenete javaslat, amíg az agent nem hajtja végre. |
| **Agent** (harness + toolok/MCP) | Végrehajtás a **jóváhagyott scope-on belül**: fájl olvasás/írás, parancsfuttatás (kapuk), MCP-hívások, PR nyitása; iterál a zöld kapukig. | **Nem** lép a jóváhagyott scope-on túl; **nem** módosítja a közös workshop-forrást; **nem** hoz irreverzibilis vagy kifelé ható lépést (repó publikálás, secret-kezelés, DB-provisioning, merge) **emberi jóváhagyás nélkül**. Hibánál a scope-on belül javít és megismétli a preflightot. |
| **Ember** | Szándék és üzleti döntés; a spec elfogadása; jóváhagyás a **két kapunál** (bootstrap-evidence és design); scope engedélyezése. | Az övé minden **irreverzibilis / kifelé ható / költséggel járó** lépés végső engedélye: repó létrehozása és láthatósága, DB-branch provisioning, merge, fizetős szolgáltatás bekapcsolása. |

**Kulcselv (README-ből):** „AI-integrálhatóság > feature-lista", és „ahol csak ember tud kattintani, ott megszakad az agent-lánc" — ezért az emberi döntéseket kapukban, nem ad-hoc kattintásokban kell tartani.

## A következő emberi döntés

**A saját, írható GitHub-repó paramétereinek megadása és a verziózás engedélyezése.**

Konkrétan három, egyszerre eldöntendő pont:
1. **Repónév** (pl. `wshp-ai-dev-participant`),
2. **Láthatóság** — javaslat: **private**,
3. Engedély, hogy az agent **most** inicializálja a git-commitot és a `gh` CLI-vel létrehozza a remote-ot + pusholjon.

**Miért ez az első:** amíg nincs remote és első push, a CI-kapuk némák, nincs preview-lánc, és a README szabálya szerint feature-munka sem indulhat (az az elfogadott bootstrap-evidence-hez kötött). Ez a lépés old fel legtöbb továbbit, és tisztán emberi hatáskör (irreverzibilis, kifelé ható). A többi hiányzó információ (spec-csomag, design-tokenek, MCP-auth) ezután, sorban vehető fel.
