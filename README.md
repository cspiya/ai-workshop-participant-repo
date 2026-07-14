# Résztvevői starter — technikai hordozó az agent-ready rendszerhez

Ez a **Wenova AI-Assisted Development Workshop** résztvevői sablonja: egy
szándékosan minimális **Next.js (App Router) + TypeScript + Tailwind +
shadcn/ui** projekt. Ez még **nem agent-ready fejlesztési rendszer**, csak a technikai hordozója. A nap
első feladata, hogy missionnel, repo-szabályokkal, kanonikus standarddal, spec-kapuval, RUG-gal és
mechanikus ellenőrzésekkel megbízható fejlesztési környezetté alakítsd.

Az ezután készülő alkalmazás a rendszer életszerű, de **KITALÁLT** validációs workloadja: azt bizonyítja, hogy az
operating modellel valóban végigvihető egy üzleti változás a specifikációtól a review-zott eredményig.

A működési szerződést ne egy konkrét modell prompt-trükkjeire építsd. A spec, standard, DoD, gate-ek és
evidence maradjanak modell- és toolfüggetlenek; a coding agent indítása és hook-bekötése legyen cserélhető
adapter. Így ugyanaz a repo szolgáltatáskiesés, költségváltozás vagy modellfrissítés után is használható.

Adatbázis, API-réteg és a többi "nagyágyú" **szándékosan nincs benne** — azok
a nap későbbi blokkjaiban kerülnek be, lépésről lépésre.

## Tech stack — és hogy miért ez (AI-natív választások)

Minden alábbi választás egyetlen elvet követ: **az agentnek a teljes kört magának
kell tudnia végigvinni.**

| Réteg | Választás | Miért |
|---|---|---|
| App-keretrendszer | Next.js App Router + TypeScript | Konvencionális, az agentek tanítókorpuszában erősen képviselt; végponttól végpontig gépileg ellenőrizhető (typecheck/lint/test/build). |
| UI | Tailwind + shadcn/ui (lokális forrás) | A komponensek szerkeszthető forrásként élnek a `src/components/ui/`-ban — az agent közvetlenül olvassa és módosítja őket, nem egy fekete dobozzal küzd. |
| Adatbázis | Neon Postgres | DB-branch preview-nként + MCP: minden változás percek alatt izolált adatbázist kap. |
| Hoszting + preview-k | Vercel | Preview-deploy PR-onként + MCP: minden változás élő URL-t kap, emberi konzol-kattintgatás nélkül. |
| Munkaállapot | Linear (issue = spec) | Az issue MAGA a spec; MCP-n át az agent maga olvassa és frissíti a munkaállapotot. |
| Forrás + kapuk | GitHub (gh CLI, PR-check-ek) | Gépileg vezérelhető verziókezelés: `gh` CLI + PR-kapuk, amelyek zöld check-ekig blokkolják a merge-öt. |
| Dizájnlépés | v0 / Claude Design | Agenttel vezérelhető dizájnlépés — lásd `DESIGN-GUIDELINE.md`. |
| Agentek | Claude Code CLI + Codex | Két független agent harness a maker/reviewer szétválasztáshoz és a modellcsere-evalokhoz. |

### Mitől AI-natív egy rendszer?

**Az AI-first / AI-natív fejlesztés azt jelenti, hogy a rendszert úgy tervezzük, hogy az
AI-agent elsőrangú munkatárs legyen benne — nem utólag rácsavarozott eszköz.** Négy ismérve van:

1. **Gyors, olcsó ciklusok** — minden változás percek alatt buildel, tesztel és kap preview-t
   (CI + PR-onkénti preview + branchelt adatbázis); az infrastruktúra soha nem lehet az agent
   iterációs sebességének szűk keresztmetszete.
2. **Feature-szintű szeparáció** — egy modul = egy agent munkaterülete (vertical slice,
   kikényszerített boundary-k): kis kontextus, kis hibaterjedés, minden feature önállóan
   FEJLESZTHETŐ és ELLENŐRIZHETŐ, párhuzamosítható agent-munka.
3. **Teljes AI-integrálhatóság** — minden eszköznek van gépi interfésze (CLI / API / MCP);
   ahol csak ember tud kattintani, ott megszakad az agent-lánc.
4. **Szerződések + verifikáció** — spec, szabályok, kapuk, független review (RUG), evidence —
   az a pillér, amit a workshop már tanít.

Stack-választási elv: **„AI-integrálhatóság > feature-lista."**

## Hogyan használd

1. A minimális bootstrap után indíts Claude Code-ot vagy Codexet abban a munkakönyvtárban, ahol a saját
   résztvevői repód lesz.
2. Mondd az agentnek, hogy a workshop forrásrepo `participant-starter` mappájából készítse elő a saját,
   írható GitHub-repódat. A közös workshop-forrást nem módosíthatja.
3. Kérd meg az agentet, hogy olvassa el az `AGENTS.md` és `DESIGN-GUIDELINE.md` fájlt, ellenőrizze a
   környezetet, telepítse a lockfile szerinti függőségeket, és futtassa a teljes preflightot.
4. Az agent adja vissza a munkakönyvtárat, a lefuttatott kapukat, az exit állapotokat, a maradék kockázatot
   és minden emberi döntést. Hibánál javítson a jóváhagyott scope-on belül, majd ismételje meg a teljes
   preflightot.
5. Feature csak az ember által elfogadott bootstrap-evidence után indulhat. Második agent opcionális
   portability smoke; nem feltétele a kötelező útnak.

## Mi a viszonya a toolkithez és a referencia-apphoz?

- **Starter (ez a mappa):** a bootstrap ezt másolja ki a saját írható repódba —
  egyszer, a nap elején. Kézzel semmit nem kell összemásolnod; az appváz, a
  CI-kapuk, az MCP-konfiguráció és a házirend előre be van kötve.
- **Toolkit:** nem kerül át egyben, és nem is kell egyesével másolgatnod. Az agent
  állomásonként veszi át a csomagjait: C1 — kanonikus mérnöki standard; C3 —
  spec-sablonok; C4–C5 — RUG-orkesztráció és gépi kapuk; C6–C7 — projektmemória és
  bevezetési sablonok. Hazafelé is így viszed: mindig a következő bevezetendő
  képesség csomagját, nem az egészet.
- **Referencia-app:** kész, tesztelt példa (a módszer próbapadja); mintát olvasol
  belőle, de sosem szerkeszted és nem klónozod.

## Agent-run technikai szerződés

Az alábbi parancsokat az agent, a hook vagy a CI futtatja. A résztvevőnek nem kell ezeket begépelnie.

| Parancs | Mit csinál |
|---|---|
| `npm run dev` | fejlesztői szerver |
| `npm run typecheck` | típusellenőrzés (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (egy minta-teszt már van) |
| `npm run build` | éles build — a Vercel is ezt futtatja |

Az önálló starter tartalmaz egy GitHub Actions workflow-t is
(`.github/workflows/ci.yml`). Amikor a starter tartalmát a saját repód
gyökerébe másolod, minden push és pull request automatikusan lefuttatja a
typecheck, lint, teszt és build kapukat.

## Fontos fájlok

- **`AGENTS.md`** — a repo működési szerződése az agent számára; önmagában nem elég, a standarddal,
  speckkel, gate-ekkel és független review-val együtt alkot rendszert.
- **`DESIGN-GUIDELINE.md`** — a dizájn-szabálykönyv váza; az agent minden
  UI-munkánál ezt követi. A nap során töltöd fel.
- **`src/components/ui/`** — shadcn/ui komponensek (helyi forráskód — az agent
  olvashatja és szerkesztheti). Új komponenst az agent a telepített verzió hivatalos eljárásával ad hozzá.
- **`.env.example`** — még üres; a `DATABASE_URL` a nap adatbázis-blokkjában
  kerül ide.

## Ha elakadsz

Abszolút linkek, hogy a saját repódba másolás után is működjenek:

- Szakszavak: [fogalomtár](https://cspiya.github.io/wshp-ai-dev-2026/materials/fogalomtar/)
- Felkészülés / telepítés: [C0 setup](https://cspiya.github.io/wshp-ai-dev-2026/materials/felkeszules/)
- Napirend: [a nap térképe](https://cspiya.github.io/wshp-ai-dev-2026/materials/napirend/)
- Első modul: [Szerepek és korlátok](https://cspiya.github.io/wshp-ai-dev-2026/materials/modulok/01-agentikus-fejlesztes/)

## A nap munkadarabja

A nap egyetlen, végigvitt munkadarabja a **KK-Regisztráció** nevű, kitalált üzleti
kérés: jelentkezés műhelyre névvel és e-mail-címmel, 48 órás — kizáró határú —
lemondási ablakkal és duplikátum-védelemmel. A 3. modulban erre a briefre írod meg a
saját öt fájlos spec-csomagodat, a C4 maker-blokkban pedig a jóváhagyott szerződést a
saját repódban implementálod az agenteddel. A tréner ugyanehhez a munkadarabhoz kész
pillanatképeket (known-good, partial, broken) tart karban tartalék-útvonalként, így a
nap akkor sem áll meg, ha egy korábbi lépés elakadt. A brief, a referencia
spec-csomag és a snapshotok leírása: [a golden-thread csomag](../toolkit/golden-thread/README.md).
