# Orchestrator configuration

Recorded configuration for the Linear-driven, multi-agent delivery orchestrator described in
[`docs/agentic-operating-model.md`](../agentic-operating-model.md). These are the defaults and
target scope the orchestrator uses; tune per `docs/agentic-operating-model.md` §5.

## Limits (defaults, spec §5)

| Parameter | Default | Description |
|---|---|---|
| `MAX_MAKERS` | 3 | Maximum maker subagents running concurrently. |
| `BOUNCE_LIMIT` | 2 | Number of review bounces before escalating to a human. |
| `AGENT_TIMEOUT` | 20m | Max run time for a single maker/reviewer agent. |
| `PER_RUN_TASK_CAP` | 10 | Max tasks attempted in one orchestrator run. |
| `RETRY` | 1 | Times a task returns to `Todo` after crash/timeout before `Blocked/Needs-human`. |
| `RESTART_INTERVAL` | 10–20m | Frequency of the periodic orchestrator restart (continuous watching). |

## Gate command

Every maker runs this gate green before handoff, and the orchestrator re-runs it on `main`
after each merge (from the repo `AGENTS.md`):

```
npm run typecheck && npm run lint && npm run test && npm run build
```

## Target scope

The orchestrator queries **only** the Mini CRM Linear project:

| Field | Value |
|---|---|
| Project name | Mini CRM (ai-workshop-participant-repo) |
| Project id | `5b4c1325-ebce-470c-939d-18db3ee2274a` |
| Team | Wenova |
| Team id | `cbff54b7-1224-4def-af34-249ce3e87113` |

Eligibility (spec §3): `state == Todo` AND no open `blockedBy` AND no live assigned maker;
ordered by priority descending, then `createdAt` ascending.

## Lifecycle sub-states — Linear labels (option B, spec §3)

This team's Linear workflow uses the default states (`Todo` / `In Progress` / `Done`), so the
lifecycle sub-states are represented with **labels** (spec §3 option B) rather than dedicated
states. The orchestrator reads the sub-state from these labels and is the only actor that writes
them. Mapping:

| Label | Lifecycle state | Meaning |
|---|---|---|
| `agent:in-review` | In Review | Maker finished + pushed branch; a reviewer is adjudicating. |
| `agent:changes-requested` | Changes Requested | Reviewer returned Critical/Serious findings; same maker fixes (≤ `BOUNCE_LIMIT` rounds). |
| `agent:needs-human` | Blocked / Needs-human | Escalated: not-developable, bounce limit exceeded, or crash after `RETRY`. Only a human clears it. |

The three labels live in the Wenova team (team id `cbff54b7-1224-4def-af34-249ce3e87113`) and
were created for this task (`agent:in-review`, `agent:changes-requested`, `agent:needs-human`).
The `blockedBy` dependency uses Linear's native blocking relation.
