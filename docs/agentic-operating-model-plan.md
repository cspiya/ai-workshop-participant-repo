# Agentic Operating Model — Implementation Plan (build the orchestrator)

> **For agentic workers:** each task below is one vertical unit with its own gate and a fresh
> reviewer's approval — the maker self-drives TDD per `AGENTS.md` rule 5. The Linear issue is the
> executable spec (per `docs/agentic-operating-model.md`), so tasks carry scope, files,
> acceptance criteria, and verification rather than micro-steps.

**Goal:** Build the orchestrator that watches Linear and drives eligible tasks through
maker → reviewer → serialized merge to `main`, per [`docs/agentic-operating-model.md`](agentic-operating-model.md).

**Architecture:** The orchestrator is a **Workflow script** (`.claude/workflows/orchestrator.mjs`)
using `agent()` / `parallel()` / `pipeline()` with `isolation:'worktree'`. Because Workflow
scripts cannot touch git/Linear/filesystem directly, all git and Linear operations happen inside
the **dispatched agents** (picker, maker, reviewer, integrator), which have Bash + MCP access.
Makers push a per-task branch (`agent/<ISSUE-ID>`); the reviewer fetches that branch; the
integrator serial-merges it to `main`. This decouples the stages so we do not depend on a shared
worktree across maker → reviewer → integrator.

**Tech stack:** Claude Code Workflow tool; Linear MCP (`mcp__linear__*`); Bash/git; the repo's
gate `npm run typecheck && lint && test && build`. No new runtime app libraries.

## Global Constraints

- The Linear issue is the executable spec; makers never invent product behavior (`DECISION REQUIRED` → escalate).
- Agents never self-approve; the orchestrator writes Linear state; makers do not.
- `main` stays green: integration only after gates pass; **serialized** merge + re-verify.
- Only humans move `Backlog → Todo`; only humans resolve `Blocked/Needs-human`.
- Bootstrap note: these build-tasks are run by a **manually-launched maker/reviewer loop** (the
  orchestrator does not build itself). Once built, the orchestrator runs the *Mini CRM* feature
  backlog (`WEN-354…357`), scoped to that project only.
- Limits (defaults, `docs/agentic-operating-model.md` §5): `MAX_MAKERS=3`, `BOUNCE_LIMIT=2`,
  `AGENT_TIMEOUT≈20m`, `PER_RUN_TASK_CAP=10`, `RETRY=1`.

---

## Phase 0 — Foundations

### Task O1: Linear lifecycle setup + orchestrator config + handoff convention

**Files:**
- Create: `docs/handoffs/README.md` (handoff template + convention, copied from spec §8)
- Create: `docs/orchestrator/config.md` (limits table + target scope)
- Linear: labels/states for the lifecycle

**Deliverable:** the state machine is representable in Linear, and the limits/scope are recorded.

**Acceptance:**
- Lifecycle sub-states exist in Linear — either dedicated states (`In Review`, `Changes Requested`, `Blocked`) **or** labels `agent:in-review`, `agent:changes-requested`, `agent:needs-human` (spec §3, choose one and document it in `config.md`).
- `config.md` records `MAX_MAKERS/BOUNCE_LIMIT/AGENT_TIMEOUT/PER_RUN_TASK_CAP/RETRY` and the **target project scope** the orchestrator queries (the Mini CRM project id).
- `docs/handoffs/README.md` contains the exact handoff template.
- Verification: `git status` clean after commit; labels/states visible in Linear.

**Depends on:** none.

### Task O2: Maker agent definition

**Files:**
- Create: `.claude/agents/maker.md` (frontmatter + system prompt from spec §6)

**Deliverable:** a reusable maker agent type the orchestrator dispatches via `agentType:'maker'`.

**Acceptance:**
- The maker prompt encodes: read `AGENTS.md` + the issue (the spec); developability check → `NOT_DEVELOPABLE` with the blocking question (no invented behavior); implement only in scope; run the full gate green; write `docs/handoffs/<ISSUE-ID>.md`; commit + push branch `agent/<ISSUE-ID>`; **do not** change Linear state or merge to main; return structured `{status, perAC, gates, branch, sha, handoffPath, assumptions}`.
- Verification: dispatch the maker on one trivial throwaway task in a scratch branch; confirm it returns the structured result and pushes a branch without touching `main` or Linear.

**Depends on:** O1.

### Task O3: Reviewer agent definition

**Files:**
- Create: `.claude/agents/reviewer.md` (frontmatter + system prompt from spec §7)

**Deliverable:** a reusable fresh-context reviewer agent type.

**Acceptance:**
- The reviewer prompt encodes: fresh context; inputs = the Linear issue + handoff file + the diff on `agent/<ISSUE-ID>` vs `main`; adversarially verify each AC; classify findings `Critical/Serious/Minor` (spec §7 definitions); return `{verdict: PASS|CHANGES-REQUESTED, critical[], serious[], minor[]}`; do not fix; do not write Linear state.
- Verification: run the reviewer against O2's throwaway branch; confirm a structured verdict with severities.

**Depends on:** O1.

---

## Phase 1 — MVP loop (sequential, one task)

### Task O4: Orchestrator Workflow v1 (single-task, sequential)

**Files:**
- Create: `.claude/workflows/orchestrator.mjs`

**Deliverable:** a Workflow that drives exactly ONE eligible task end-to-end.

**Behavior:**
1. **Picker** `agent()` (schema): query Linear for `Todo` issues in the target project with no open `blockedBy`; return the top one by priority then createdAt.
2. If none → `log("no eligible work")` and stop.
3. Set issue → `In Progress` (via an agent that calls Linear MCP).
4. **Maker** (`agentType:'maker'`, `isolation:'worktree'`) → returns structured result; if `NOT_DEVELOPABLE` → set `Blocked/Needs-human` with reason and stop.
5. **Reviewer** (`agentType:'reviewer'`) on the pushed branch → verdict.
6. On `CHANGES-REQUESTED`: set `Changes Requested`, resume the same maker with findings, re-review — at most `BOUNCE_LIMIT` rounds; then `Blocked/Needs-human`.
7. On `PASS`: **integrator** agent merges `agent/<ISSUE-ID>` → `main`, re-runs the gate; green → push `main`, set issue `Done`, record evidence; red/conflict → `Changes Requested` + resume maker.

**Acceptance:**
- Dry run on a **safe seeded test issue** (a throwaway "add a docs line" task in the target project's `Todo`): the workflow moves it `Todo → In Progress → In Review → Done`, `main` gets the change, gate stays green, and a handoff file is committed. Evidence (run id, Linear transitions) captured.
- No Linear state written by maker/reviewer — only by the orchestrator's integrator/picker agents.

**Depends on:** O2, O3.

---

## Phase 2 — Parallelism

### Task O5: Parallel makers + serialized integration

**Files:**
- Modify: `.claude/workflows/orchestrator.mjs`

**Deliverable:** up to `MAX_MAKERS` tasks developed concurrently; integration serialized.

**Behavior:**
- Picker returns up to `MAX_MAKERS` eligible tasks. Develop them concurrently via `parallel()` (each maker `isolation:'worktree'`, own branch). Reviewers run per task as each maker finishes (`pipeline()` so a fast task reviews while others still build).
- **Integration is serialized** with a single merge step: merge PASSED branches into `main` one at a time, re-verifying the gate after each; a conflict or red gate on integration bounces that task to `Changes Requested` and resumes its maker, without blocking the others.

**Acceptance:**
- Two seeded non-conflicting test issues run concurrently and both reach `Done`; `main` is green after each merge.
- A deliberately conflicting seeded pair: the second merge detects the conflict, bounces that task (not the first), and the first still lands. Evidence captured.

**Depends on:** O4.

---

## Phase 3 — Continuous operation + safety

### Task O6: Caps, timeouts, crash handling, drain-then-stop

**Files:**
- Modify: `.claude/workflows/orchestrator.mjs`

**Deliverable:** bounded, resilient single run.

**Behavior:**
- `PER_RUN_TASK_CAP` bounds a run; the run drains eligible work then stops.
- Per-agent timeout; a maker/reviewer crash or timeout sets the task back to `Todo` (or `Blocked/Needs-human` after `RETRY`), and the run continues with others.
- Config (`MAX_MAKERS/BOUNCE_LIMIT/PER_RUN_TASK_CAP/RETRY`) read from `docs/orchestrator/config.md` (or `args`), not hard-coded.

**Acceptance:**
- Seed more than `PER_RUN_TASK_CAP` eligible tasks → exactly the cap are attempted, the rest remain `Todo`, run stops cleanly (logged).
- Simulate a maker failure (a task whose gate can't pass) → task ends `Blocked/Needs-human` after `RETRY`, run does not hang.

**Depends on:** O5.

### Task O7: Continuous watching (periodic restart)

**Files:**
- Create: `docs/orchestrator/run.md` (how to run continuously)
- Optional: a saved `/loop` invocation or a scheduled routine definition

**Deliverable:** the orchestrator re-runs on an interval to pick up newly-`Todo` tasks.

**Acceptance:**
- Documented one-command continuous run (`/loop <RESTART_INTERVAL> <orchestrator>` or a schedule) that, after draining, sleeps and re-checks; verified by adding a new `Todo` task and observing the next cycle pick it up.

**Depends on:** O6.

---

## Phase 4 — Evidence + first real autonomous run

### Task O8: Evidence recording + escalation comments

**Files:**
- Modify: `.claude/workflows/orchestrator.mjs` (integrator/escalation agents)

**Deliverable:** every terminal transition leaves an auditable trail.

**Acceptance:**
- On `Done`: a Linear comment with commit SHA, gate exit codes, handoff link, and (if deployed) the Vercel URL.
- On `Blocked/Needs-human`: a Linear comment with the exact blocking reason/findings and the owner.
- Verified on the Phase-1/2 seeded runs.

**Depends on:** O6.

### Task O9: First real end-to-end autonomous run (validation)

**Files:** none (operational)

**Deliverable:** the orchestrator runs a real Mini CRM feature with no human in the dev loop.

**Acceptance:**
- A human moves one real feature (e.g., `WEN-354` Companies) to `Todo`; the orchestrator takes it, a maker implements, a reviewer passes it (or bounces then passes), it serial-merges to `main`, deploys green, and the issue is `Done` — all evidence in Linear. This proves the operating model on the real workload.

**Depends on:** O7, O8.

---

## Self-review

- **Spec coverage:** roles (O2/O3/O4), state machine (O1/O4), eligibility (O4 picker), parallel+worktree (O5), serialized merge+re-verify (O4/O5), bounce≤2→Blocked (O4), not-developable→Blocked (O2/O4), handoff file (O1/O2), reviewer severity (O3), human gates (O1 grooming, O8 escalation), config/limits (O1/O6), continuous (O7), evidence (O8), portability (docs) — all mapped.
- **No placeholders:** each task has files, deliverable, acceptance, verification.
- **Consistency:** branch name `agent/<ISSUE-ID>`, agent types `maker`/`reviewer`, script `.claude/workflows/orchestrator.mjs`, config `docs/orchestrator/config.md` used consistently across tasks.
