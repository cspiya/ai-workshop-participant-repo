# Running the orchestrator

Operator guide for the Linear-driven delivery orchestrator
(`.claude/workflows/orchestrator.mjs`). It describes how to launch a single run,
how to run it continuously (periodic restart), and the operating rules around it.
Background: [`docs/agentic-operating-model.md`](../agentic-operating-model.md) §4
(a run drains then stops; continuous watching = periodic restart) and §5
(`RESTART_INTERVAL` 10-20m); config in [`config.md`](config.md).

The orchestrator is a **Workflow script**, launched via the **Workflow tool** - not
a shell command. Its full contract (parallel-develop + serialized-integrate,
crash/RETRY, drain-then-stop) lives in the script's `meta`.

## 1. One-shot run (drain-then-stop)

A single run picks up eligible `Todo` tasks in the Mini CRM project, develops up to
`MAX_MAKERS` concurrently, serial-merges the passing ones to `main`, and repeats
picker rounds until no eligible work remains **or** `PER_RUN_TASK_CAP` tasks have
been attempted - then it **stops**. It does not keep watching on its own.

Invoke the Workflow tool with:

```json
{ "scriptPath": ".claude/workflows/orchestrator.mjs", "args": {} }
```

### Dry-run (picker only, no side effects) - run this first

```json
{ "scriptPath": ".claude/workflows/orchestrator.mjs", "args": { "dryRun": true } }
```

Dispatches **only** the picker and logs every task it would take plus the intended
plan. No Linear writes, no maker/reviewer/integrator dispatch, no merge. Use it to
preview what a live run would pick up.

### Args overrides

All limits default from [`config.md`](config.md) and are overridable per run via
`args` (omit any you don't want to change):

| Arg | Default | Effect |
|---|---|---|
| `dryRun` | `false` | Picker-only preview, no side effects. |
| `maxMakers` | `3` | Max makers developed concurrently per round. |
| `perRunTaskCap` | `10` | Max tasks a single run will attempt before stopping. |
| `bounceLimit` | `2` | Review/integration bounces before escalating to a human. |
| `retry` | `1` | Agent-crash retries before the task is set Blocked/Needs-human. |

Example (smaller supervised run):

```json
{ "scriptPath": ".claude/workflows/orchestrator.mjs",
  "args": { "maxMakers": 1, "perRunTaskCap": 2 } }
```

## 2. Continuous watching = periodic restart

Because a run drains then stops, **continuous operation is achieved by re-invoking
the orchestrator on an interval**. After a run drains, it waits, then a fresh run
picks up any tasks that a human has since moved to `Todo`. Pick ONE of the two
options below. Interval = `RESTART_INTERVAL` (default **10-20m**, from
[`config.md`](config.md)).

### Option A - self-paced loop (`/loop`)

Run the `/loop` skill with the restart interval and an instruction to launch the
orchestrator each cycle:

```
/loop 15m Invoke the Workflow tool with { "scriptPath": ".claude/workflows/orchestrator.mjs", "args": {} } and report the finished-task summary.
```

Each cycle runs one drain-then-stop orchestrator run; between cycles the loop waits
the interval and then re-checks Linear, so newly-`Todo` tasks are picked up on the
next cycle. (Omit the interval to let the loop self-pace between runs.) This is the
simplest option and keeps the run under your live session.

### Option B - scheduled routine (cron)

Use the `/schedule` skill to create a routine that wakes on the interval and runs
the orchestrator, e.g. every 15 minutes:

```
/schedule every 15 minutes: invoke the Workflow tool with { "scriptPath": ".claude/workflows/orchestrator.mjs", "args": {} }
```

A schedule runs unattended (no live session needed) and is the better fit for
leaving the pipeline watching over long periods. Each scheduled wake is one
drain-then-stop run.

## 3. Operating notes

- **Entry gate is human-only.** The orchestrator only ever picks tasks already in
  `Todo`; moving a task `Backlog -> Todo` is a human decision. To feed the pipeline,
  groom tasks into `Todo`; to hold work back, leave it in `Backlog`.
- **Auto-integration.** A `PASS` from the independent reviewer is merged to `main`
  automatically after the gate re-runs green - no human approval gate before
  `Done` (pre-production flow; see `AGENTS.md` rule 8).
- **Escalation is human-only to clear.** A task that is `NOT_DEVELOPABLE`, exceeds
  `bounceLimit`, or keeps crashing past `retry` is labelled `agent:needs-human` and
  left for a human. The orchestrator never picks a `needs-human` task again until a
  human resolves it (removes the label / edits the issue) and returns it to `Todo`.
- **How to stop.**
  - Option A: end the `/loop` (stop the loop skill / your session). The current run
    finishes its in-flight tasks first - it drains, it does not abort mid-merge.
  - Option B: disable or delete the scheduled routine via `/schedule`.
  - There is no separate kill switch inside the script; stopping the driver
    (loop or schedule) stops future runs.
- **Where evidence lands.** Every terminal transition is auditable:
  - `main` commits - the serialized merge commits (and pushed branch history).
  - Linear issue comments - on `Done`, the integrator posts the merge SHA, the four
    gate exit codes, and a link to `docs/handoffs/<ISSUE-ID>.md`; on escalation, the
    blocking reason / reviewer findings.
  - Handoff files - `docs/handoffs/<ISSUE-ID>.md`, committed on each task branch.
  - The Workflow run log - the picker rounds, per-task outcomes, and the
    drain-then-stop summary line (processed N, stopped: drained / cap-reached).

## 4. Preconditions

- Linear MCP reachable; the Mini CRM project scoped in [`config.md`](config.md).
- Git remote (GitHub) writable; the gate
  `npm run typecheck && npm run lint && npm run test && npm run build` green on `main`.
- At least one eligible `Todo` task, or the run logs `no eligible work` and stops.
