# Agentikus működési modell — orchestrator + maker + reviewer

> **Mi ez?** Egy továbbadható, önálló specifikáció egy Linear-vezérelt, több-agentes
> szállítási működéshez. Egy **orchestrator** figyeli a Lineart, felveszi az arra érett
> taskokat, párhuzamos **maker** subagenteknek osztja ki, majd független **reviewer**
> agentekkel ellenőrizteti, és a zöld eredményt a `main`-be integrálja — emberi kapukkal a
> belépésnél és az eszkalációnál. A Mini CRM ennek a validációs munkaterhe; a modell maga
> repo-független, más résztvevő is átveheti.
>
> **Konvenció:** a narratíva magyar; az agentnek adott promptok, szerződések, sablonok és
> minden gépi elem **angol** (a modellek angolul követik legpontosabban).
>
> Verzió: v1 · Dátum: 2026-07-14 · Kapcsolódó: [`AGENTS.md`](../AGENTS.md), [`docs/implementation-plan.md`](implementation-plan.md), [`docs/spec-package/`](spec-package/)

---

## 1. Cél és alapelvek

A cél, hogy a Backlogból emberi prioritizálással kiengedett munkát **agentek vigyék végig**
specifikációtól a zöld, deployolt `main`-ig — determinisztikus koordinációval és
ellenőrizhető bizonyítékkal, ember pedig csak a valódi döntési pontokon avatkozzon be.

**Nem alku tárgya (invariánsok):**
1. **Emberi kapu a belépésnél és az eszkalációnál.** Csak ember tesz taskot `Todo`-ba, és csak
   ember old fel `Blocked/Needs-human` taskot.
2. **Az agent sosem hagyja jóvá saját magát.** A maker nem review-zza a saját munkáját; a
   verdiktet a független reviewer adja; a state-et az orchestrator írja.
3. **A `main` mindig zöld marad.** Integráció csak zöld kapuk (`typecheck && lint && test &&
   build`) után; sorosított merge + re-verify.
4. **Bizonyíték minden lépéshez.** Handoff file, kapu-exit-kódok, commit SHA, Linear-komment.
5. **Korlátos autonómia.** Párhuzamosság-cap, bounce-limit, per-agent timeout, drain-then-stop.

---

## 2. Szereplők és felelősségek

| Szereplő | Ki/mi | Felelősség | Amit NEM tehet |
|---|---|---|---|
| **Orchestrator** | 1 db, Workflow-motor | Az egyetlen, aki taskot vesz fel és kioszt; Linear-state-et ír; koordinálja a makereket/reviewereket; sorosítja a merge-öt | Nem fejleszt, nem review-zik, nem dönt üzleti kérdésben |
| **Maker** | Párhuzamos subagentek, külön git-worktree | Implementál a task acceptance criteria-jára; kapukat zöldre futtat; handoff file-t ír | Nem ír Linear-state-et, nem merge-el main-be, nem review-zza magát, nem talál ki termékdöntést |
| **Reviewer** | Friss-kontextusú subagent (a makertől független) | Adverzáriálisan ellenőrzi a kész munkát a task ellen; findingokat súlyoz; verdiktet ad | Nem javít, nem ír Linear-state-et, nem implementál |
| **Ember** (product owner) | Résztvevő | Backlog→Todo grooming; `Blocked/Needs-human` feloldás; leállítás; irreverzibilis/kifelé ható döntések | — |

---

## 3. Task-életciklus (állapotgép)

```text
Backlog ──(ember)──▶ Todo ──(orchestrator: eligible?)──▶ In Progress ──(maker kész + handoff)──▶ In Review
  In Review ─ PASS (nincs Critical/Serious) ─▶ [orchestrator: sorosított merge → re-verify] ─▶ Done
  In Review ─ Critical/Serious ─▶ Changes Requested ─(UGYANAZ a maker javít, ≤2 kör)─▶ In Review
                                    └─ 2 sikertelen kör után ─▶ Blocked (Needs-human)
  Maker: "nem fejleszthető" ─▶ Blocked (Needs-human)
  Integrációs konfliktus / piros kapu a main-en ─▶ Changes Requested (vissza az adott makernek)
  Agent crash / timeout ─▶ vissza Todo (vagy Blocked N próba után)
```

**Eligibility (mikor vehető fel egy task):**
- state == `Todo`, **és**
- nincs nyitott `blockedBy` (minden blokkoló task `Done`), **és**
- nincs folyamatban (nincs hozzárendelt élő maker).
- **Sorrend:** prioritás csökkenő, majd létrehozási idő növekvő.

**Minor findingok:** nem blokkolnak → a handoff review-szekciójába kerülnek, és opcionálisan
külön `Backlog` taskként rögzülnek. Csak `Critical`/`Serious` dob vissza.

### Linear state-leképezés (testreszabható)

Kétféleképp valósítható meg — válaszd a csapatod Linearjéhez illőt:

- **A) Dedikált state-ek** (ha a team workflow-ja engedi): `Todo → In Progress → In Review →
  Changes Requested → Blocked → Done`.
- **B) Meglévő state-ek + címkék** (ha nem vehetsz fel state-et): `Todo`/`In Progress`/`Done`
  + címkék: `agent:in-review`, `agent:changes-requested`, `agent:needs-human`. Az orchestrator
  a címkékből olvassa az al-állapotot.

A `blockedBy` a Linear natív blocking-relációja (a példaprojektben már beállítva F0→F1→F2…).

---

## 4. Orchestrator-ciklus (egy futás algoritmusa)

```text
FUNCTION orchestrator_run(config):
  eligible = linear.query(state == Todo AND no open blockedBy)
             .sort(priority desc, createdAt asc)
             .take(config.PER_RUN_TASK_CAP)
  IF eligible is empty: STOP ("no eligible work")

  # Fejlesztés párhuzamosan, integráció sorosítva
  FOR each task in eligible, up to config.MAX_MAKERS concurrently:
     linear.set(task, In Progress)
     worktree = git.worktree(task.branchName)      # izoláció
     maker_result = dispatch_maker(task, worktree)  # per-agent timeout

     IF maker_result == NOT_DEVELOPABLE:
        linear.set(task, Blocked/Needs-human, reason); CONTINUE
     IF maker_result == TIMEOUT or CRASH:
        task.attempts += 1
        linear.set(task, Todo if attempts < RETRY else Blocked/Needs-human); CONTINUE

     # Review-kör (max BOUNCE_LIMIT)
     rounds = 0
     LOOP:
        linear.set(task, In Review)
        verdict = dispatch_reviewer(task, worktree, handoff_file)   # fresh context
        IF verdict == PASS: BREAK
        rounds += 1
        IF rounds > config.BOUNCE_LIMIT:
           linear.set(task, Blocked/Needs-human, findings); GOTO next task
        linear.set(task, Changes Requested)
        maker_result = resume_same_maker(task, worktree, verdict.findings)

     # Integráció — SOROSÍTVA (egyszerre egy merge a main-be)
     WITH merge_lock:
        git.merge(worktree.branch → main)
        IF conflict OR gate(main) not green:
           linear.set(task, Changes Requested); resume_same_maker(...); RETRY review+merge
        ELSE:
           git.push(main); linear.set(task, Done); record_evidence(task)
     git.worktree_remove(worktree)

  STOP  # drain-then-stop; a periódikus újraindítás viszi tovább
```

**Continuous működés:** egy futás leüríti az aktuális eligible sort, majd leáll. A folytonos
figyelést **periódikus újraindítás** adja (`/loop <interval>` vagy ütemezett agent), ami
újra meghívja az orchestratort, amikor új `Todo` task jelenik meg.

---

## 5. Konfiguráció (alapértékek, testreszabható)

| Paraméter | Alap | Leírás |
|---|---|---|
| `MAX_MAKERS` | 3 | Egyszerre futó maker subagentek maximuma |
| `BOUNCE_LIMIT` | 2 | Hány review-visszadobás után eszkalál emberhez |
| `AGENT_TIMEOUT` | 20 perc | Egy maker/reviewer max futásideje |
| `PER_RUN_TASK_CAP` | 10 | Egy orchestrator-futás max taskja |
| `RETRY` (crash) | 1 | Hányszor kerül vissza Todo-ba crash/timeout után, mielőtt Blocked lesz |
| `RESTART_INTERVAL` | 10–20 perc | A periódikus újraindítás gyakorisága |

**Kapuk (gate):** `npm run typecheck && npm run lint && npm run test && npm run build` — a repo
`AGENTS.md`-jéből; minden makernek zöldre kell futtatnia handoff előtt, és az orchestrator a
merge után a `main`-en újrafuttatja.

---

## 6. Maker-szerződés + indító prompt

A maker a saját worktree-jében dolgozik, a Linear-issue **maga a spec**. Nem ír Linear-state-et
és nem merge-el — csak implementál, kapukat zöldre futtat, handoffot ír, és strukturáltan
visszaad. Ha a task nem fejleszthető (kétértelmű / emberi döntés / hiányzó függőség), **nem
talál ki** semmit, hanem `NOT_DEVELOPABLE`-t ad vissza az okkal.

```text
You are a MAKER agent. Your git worktree: <WORKTREE_PATH> (branch <BRANCH>). Task: <ISSUE-ID> — <URL>.

1. Read AGENTS.md and the Linear issue (its description + acceptance criteria ARE the spec).
   If docs/spec-package/ has an approved package for this slice, follow it.
2. First decide if the task is developable: clear scope, acceptance criteria, and no missing
   product decision or unmet dependency. If NOT, stop and return NOT_DEVELOPABLE with the exact
   blocking question — do NOT invent product behavior.
3. Implement ONLY within this task's scope, following the locked stack and rules in AGENTS.md.
   Do not touch files outside the task scope; do not add unapproved libraries.
4. Run the full gate and fix until green: npm run typecheck && lint && test && build.
5. Write the handoff file docs/handoffs/<ISSUE-ID>.md (template below) and commit your work on
   this branch (English message; end with the Co-Authored-By line). Do NOT merge to main and do
   NOT change any Linear state — the orchestrator does that.
6. Return a structured result: DONE | NOT_DEVELOPABLE | BLOCKED, per-AC status, exact gate
   commands + exit codes, branch + commit SHA, handoff file path, and any assumptions/risks.
```

---

## 7. Reviewer-szerződés + indító prompt + súlyossági taxonómia

A reviewer **friss kontextusú** (nincs maker-emléke), és a task ellen adverzáriálisan vizsgál.
Nem javít és nem ír Linear-state-et — csak verdiktet ad findingokkal.

**Súlyossági taxonómia:**
- **Critical** — hibás/nem teljesített acceptance criterion; adatvesztés; biztonsági/secret-hiba;
  piros kapu; scope-túllépés a repo határain túl. → **bounce**
- **Serious** — az AC formálisan teljesül, de jelentős defektus: rossz viselkedés éles esetben,
  hiányzó validáció, enum/kontraktus-sértés, nem kezelt hibaág. → **bounce**
- **Minor** — stílus, elnevezés, apró UX, nem blokkoló. → **nem bounce**; a handoffba kerül és
  opcionálisan új Backlog-task.

`PASS` = nincs `Critical` és nincs `Serious` finding.

```text
You are an independent REVIEWER with FRESH context. Inputs: the original Linear issue <ISSUE-ID>
(<URL>) and its acceptance criteria, the handoff file docs/handoffs/<ISSUE-ID>.md, and the diff
on branch <BRANCH> (vs main).

Adversarially verify the work AGAINST the issue's acceptance criteria — try to REFUTE each "met"
claim with a concrete failing scenario. Check: every AC actually met; no scope creep beyond the
task; gates truly green; no secret/DATABASE_URL committed; validation guards every mutation; enum
values match the spec; error/edge paths handled.

Classify each finding as Critical / Serious / Minor (definitions provided). Return a verdict:
- PASS  (no Critical and no Serious findings), or
- CHANGES-REQUESTED (list every Critical/Serious finding with a concrete failing scenario).
List Minor findings separately. Do NOT fix anything and do NOT change Linear state.
```

---

## 8. Handoff file sablon (`docs/handoffs/<ISSUE-ID>.md`, commitált)

```markdown
# Handoff — <ISSUE-ID>: <title>

- Issue: <URL>
- Branch / worktree: <BRANCH>
- Commit(s): <SHA>
- Maker: <agent label> · Date: <YYYY-MM-DD>

## Scope / files changed
- <path> — <what changed>

## Acceptance criteria — per-AC status
| AC | Status | Evidence (test / command / manual) |
|----|--------|------------------------------------|
| AC-1 | PASS | npm run test → 0 (…); manual: … |

## Gate results
- typecheck: exit 0 · lint: exit 0 · test: exit 0 (N passed) · build: exit 0

## Decisions / assumptions
- <decision> — <why> (owner: <human> if product-level)

## Known risks / follow-ups
- <risk or "none">

## How to verify
- <exact commands / URL / steps a reviewer runs>
```

---

## 9. Emberi érintkezési pontok

1. **Belépés:** csak ember tesz taskot `Backlog → Todo`-ba (mit engedünk az autonóm pipeline-ba).
2. **Eszkaláció:** `Blocked/Needs-human` taskot ember old fel (döntés, pontosítás, függőség).
3. **Leállítás:** ember bármikor megállíthatja az orchestratort.

**Nincs** emberi kapu a `PASS → Done` és az integráció (`merge → main`) előtt — ez autonóm,
a zöld kapuk és a független review a védőháló. (Production után ez szigorodhat: lásd
`AGENTS.md` 8. szabály — akkor branch → PR → preview → review → merge.)

---

## 10. Előfeltételek és futtatás

**Egy résztvevői repóhoz kell:**
- Agent-ready repo: olvasható `AGENTS.md`, valódi kapu-parancsok (`typecheck/lint/test/build`),
  zöld CI.
- Linear-projekt, a taskok `blockedBy` relációkkal; ember által `Todo`-ba tett, eligible issue-k.
- Git remote (GitHub) + a pre-production `main`-flow (vagy production után PR-flow).
- (Opcionális, de a workshopban adott) Neon DB-branch + Vercel git-linkelt deploy a preview/verify-hoz.

**Indítás (magas szinten):**
- Az orchestrator egy **Workflow-szkript**, ami a fenti algoritmust futtatja: Linear-lekérdezés →
  párhuzamos maker-fanout (worktree-izoláció) → reviewer-pipeline → sorosított merge → Linear-írás.
- A **folytonos figyelést** `/loop <interval>` vagy ütemezett agent adja, ami periodikusan
  újrahívja az orchestratort.
- **Az implementáció (a Workflow megírása és elindítása) külön, emberileg engedélyezett lépés** —
  ez a spec csak a szerződést rögzíti, működést nem indít.

---

## 11. Adaptálás más repóhoz (portabilitás)

- Cseréld a kapu-parancsokat a saját repo `AGENTS.md`-jéből.
- Cseréld a Linear team/projekt azonosítót és a state-leképezést (A vagy B a 3. szakaszból).
- A maker/reviewer promptok repo-függetlenek; a stack-specifikus szabályok az `AGENTS.md`-ből jönnek.
- A `MAX_MAKERS`, `BOUNCE_LIMIT`, `AGENT_TIMEOUT`, `PER_RUN_TASK_CAP` a 5. szakasz szerint hangolható.

---

## 12. Nyitott / testreszabható pontok (döntsd el a saját kontextusodban)

- **State vs címke** leképezés (3. szakasz A/B).
- **Reviewer futtatókörnyezete:** friss subagent (alap) vagy külön harness (pl. Codex) a maker/
  reviewer harness-diverzitásért, ahol elérhető.
- **Súlyossági határok** finomhangolása (7. szakasz).
- **Párhuzamosság és limitek** (5. szakasz).
- **Minor findingok:** csak handoffba, vagy automatikus új Backlog-task is.
