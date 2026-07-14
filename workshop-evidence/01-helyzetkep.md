# Repo-helyzetkép

_Dátum: 2026-07-14 · Módszer: olvasás + megfigyelhető parancseredmények, kód nem módosult._

## A repo célja
Workshop **résztvevői starter** — az agent-ready fejlesztési rendszer *technikai hordozója*, nem maga a rendszer. Minimál Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui projekt, amelyet a nap során missionnel, repo-szabályokkal, kanonikus standarddal, spec-kapuval, RUG-gal és mechanikus kapukkal kell megbízható operating modellé alakítani. (Forrás: `README.md`, `AGENTS.md`.)

## Amit az agent feltételezhet
- A stack Next.js 16 + TS + Tailwind v4 + shadcn/ui, függőségek telepítve. (forrás: `package.json`, `node_modules/` jelenléte)
- A mechanikus kapuk léteznek és **zölden futnak**: `typecheck`, `lint`, `test`. (forrás: lentebb, „Ellenőrzési mód" — ELLENŐRZÖTT)
- CI-workflow bekötve: push/PR-re typecheck→lint→test→build. (forrás: `.github/workflows/ci.yml`)
- A `gh` CLI hitelesített `cspiya` néven, `repo`+`workflow` scope-pal. (forrás: `gh auth status`)
- Van remote, a repó **public**, a `main` követi az `origin/main`-t, working tree tiszta. (forrás: `git status -sb`, `gh repo view`)
- Az MCP-konfig token nélküli, csak URL-eket tartalmaz. (forrás: `.mcp.json`)
- Nincs perzisztencia: `.env` nincs, `DATABASE_URL` a nap DB-blokkjában jön. (forrás: `.env.example`, `.gitignore`)

## Amit az agent nem feltételezhet
- Hogy van jóváhagyott spec — `docs/spec/` nem létezik; a KK-Regisztráció WHAT-ja nincs rögzítve.
- Hogy a design-döntések eldőltek — `DESIGN-GUIDELINE.md` minden értéksora üres placeholder.
- Hogy a Linear/Neon/Vercel/GitHub MCP ténylegesen hitelesített és hívható — ezt saját paranccsal nem ellenőriztem (lásd Ismeretlenek/2).
- Hogy a CI a remote-on lefutott zöldre — a push megtörtént, de az Actions-eredményt nem ellenőriztem (lásd Ismeretlenek/3).
- Az üzleti szemantikát (48h **kizáró** lemondási határ pontos értelmezése, duplikátum-védelem szabálya) — sehol nincs gépi formában.

## Ellenőrzési mód

**(A) Mechanikus kapuk — ELLENŐRZÖTT**
- Pontos parancs: `npm run typecheck && npm run lint && npm run test`
- Várt, megfigyelhető eredmény: mindhárom 0 exit-kóddal zár, a teszt zöld.
- Tényleges eredmény: `typecheck exit: 0`, `lint exit: 0`, `test` → `Test Files 1 passed (1)` / `Tests 1 passed (1)`, `exit: 0`.
- Állapot: **ELLENŐRZÖTT**

**(B) MCP-szolgáltatások élő auth-ja — ISMERETLEN**
- Pontos parancs: `/mcp` (Claude Code), majd pl. Linear `list_teams` / Neon `list_projects` egy benign hívással.
- Várt, megfigyelhető eredmény: mindegyik szerver `connected`, és egy listázó hívás hibamentes választ ad.
- Tényleges eredmény: saját, verifikáló paranccsal nem futtattam le ebben a diagnózisban.
- Állapot: **ISMERETLEN**
- Ha ismeretlen: döntési felelős **ember** (a böngészős OAuth-ot ő futtatja); tisztázandó: mely szolgáltatások élnek, és melyikre van szükség a következő lépéshez.

## Ismeretlenek
1. **Kérdés:** Mi a KK-Regisztráció jóváhagyott spec-csomagja (constitution/spec/given-when-then/plan/tasks)?
   **Miért számít:** ez a WHAT; nélküle nincs elfogadási kritérium, és a README szerint feature nem indulhat.
   **Válaszadó szerep:** ember (fogalmaz/jóváhagy), agent segít fogalmazványt írni.
   **Addig tiltott feltételezés:** az agent nem találhatja ki a 48h-határ vagy a duplikátum-védelem szemantikáját.

2. **Kérdés:** A Linear/Neon/Vercel/GitHub MCP ténylegesen hitelesített és hívható-e?
   **Miért számít:** ezekre épül az issue=spec, DB-branch és preview lánc; ha nem élnek, megszakad az agent-lánc.
   **Válaszadó szerep:** ember (OAuth böngészőben), majd agent egy benign listázó hívással verifikál.
   **Addig tiltott feltételezés:** az agent nem feltételezheti, hogy bármelyik MCP-hívás sikerülni fog.

3. **Kérdés:** A CI a remote-on zöldre futott-e az initial push után?
   **Miért számít:** a merge-kapuk csak akkor védenek, ha a workflow valóban lefut és zöld.
   **Válaszadó szerep:** agent ellenőrizheti (`gh run list`), az eredményt ember veszi tudomásul.
   **Addig tiltott feltételezés:** a lokálisan zöld kapuk ≠ a remote CI zöld.

4. **Kérdés:** Mik a design-tokenek (brand, szín, tipográfia, layout)?
   **Miért számít:** minden UI-munka ezt a szerződést követi; üres guideline = nyitott döntés.
   **Válaszadó szerep:** ember (jóváhagy a design-kapunál), agent draftol v0/Claude Design útján.
   **Addig tiltott feltételezés:** az agent nem talál ki színt/fontot a guideline nélkül.

## Szerephatárok
- **Modell (LLM):** szöveg/kód generálása — spec-fogalmazvány, diff-javaslat, elemzés. Nincs oldalhatás-felelőssége; nem dönt scope-ról és nem hagy jóvá. A kimenete javaslat, amíg az agent nem hajtja végre.
- **Coding agent (harness + toolok/MCP):** végrehajtás a **jóváhagyott scope-on belül** — fájl olvasás/írás, parancsfuttatás (kapuk), MCP-hívások, PR nyitása; iterál a zöld kapukig. Nem lép a scope-on túl, nem módosít közös workshop-forrást, és emberi jóváhagyás nélkül nem tesz irreverzibilis/kifelé ható lépést.
- **Ember:** szándék és üzleti döntés; spec elfogadása; jóváhagyás a kapuknál (bootstrap-evidence, design); scope engedélyezése; minden irreverzibilis/kifelé ható/költséges lépés végső engedélye (repó láthatóság, DB-provisioning, merge, fizetős szolgáltatás).
- **Független ellenőrző (RUG / reviewer):** a maker agenttől elkülönült második nézőpont — a diffet, az evidence-t és a spec-megfelelést nézi, nem a szerzőét ismétli. Blokkolhat merge-öt; nem ő dönt üzleti szemantikáról, azt visszautalja az emberhez.

## Következő emberi döntés
A repó már létezik (public) és a kezdeti állapot fel van pusholva — a legkorábbi blokkoló emberi döntés innen a **KK-Regisztráció jóváhagyott spec-csomagjának elfogadása** (a WHAT rögzítése: 48h kizáró határ + duplikátum-védelem gépileg ellenőrizhető elfogadási kritériumokként). Ez a spec-kapu; a README szabálya szerint feature-munka csak elfogadott evidence után indulhat, így ez old fel minden további implementációs lépést. (Párhuzamosan, olcsó lépésként az agent ellenőrizheti a remote CI zöldjét és az MCP-auth állapotát — ezek nem emberi döntések, csak verifikációk.)
