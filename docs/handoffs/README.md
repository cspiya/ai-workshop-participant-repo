# Handoff convention

Every maker agent writes a **handoff file** at `docs/handoffs/<ISSUE-ID>.md` and commits it
on its task branch (`agent/<ISSUE-ID>`). The handoff is the maker → reviewer → orchestrator
evidence trail: it records what changed, the per-acceptance-criterion status, the gate exit
codes, the branch and commit SHA, any decisions/assumptions, known risks, and the exact steps a
fresh-context reviewer runs to verify the work. The reviewer reads this file (plus the Linear
issue and the branch diff) to adjudicate; the orchestrator reads it to record evidence on the
Linear issue. Use the exact template below (from `docs/agentic-operating-model.md` §8).

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
