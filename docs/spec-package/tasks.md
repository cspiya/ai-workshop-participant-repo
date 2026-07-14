# Task breakdown

Required input: approved spec and plan versions. Tasks must be independently verifiable,
small enough to review, and assigned exclusive file/module ownership where parallel work is used.

## Input versions

- Constitution:
- Spec:
- Plan:
- Human approval evidence:

## Ordered tasks

| ID | Task/outcome | Exclusive scope | Accountable owner | Depends on/order | AC IDs | Exact verification command | Evidence location | Status |
|---|---|---|---|---|---|---|---|---|
| T1 |  |  |  |  |  |  |  | not-started |

## Per-task execution contract

Before editing, the builder:

1. restates the linked ACs and scope;
2. reads repository instructions and canonical standards;
3. reports `DECISION REQUIRED` rather than inventing behavior;
4. runs the named checks and records command, exit code, and relevant output;
5. hands the artifact and evidence to an independent fresh-context review.

A task is done only when its ACs pass, accepted findings are fixed and re-verified, and
remaining risk has a human owner.

## Acceptance coverage matrix

Every acceptance criterion must have at least one owned task, explicit dependency/order,
an exact command, and an evidence location before this package can enter implementation.

| AC ID | Scenario(s) | Owned task(s) | Dependencies/order | Exact check | Evidence location | Verdict |
|---|---|---|---|---|---|---|
| AC-1 |  |  |  |  |  | pending |

## RUG execution and closed-gate handoff

- Builder restatement task:
- Independent fresh-context reviewer task:
- Accepted-finding bounce-back owner/task:
- Re-verification command and evidence location:
- Closed-spec-gate packet location:
- Statement that feature implementation has not started:

- [ ] Every AC appears in the coverage matrix.
- [ ] Every task has exactly one accountable owner and exclusive scope.
- [ ] Dependencies and execution order are explicit, including review and bounce-back.
- [ ] Every check is an executable command, not a generic test label.
- [ ] Every evidence location is named before work starts.
- [ ] No unresolved decision or instructional placeholder remains; `N/A` includes a reason.
- [ ] Approved constitution, spec, and plan versions are recorded.
- [ ] A human has approved entry into the later implementation phase.

## Decision and deviation log

| Decision/deviation | Owner | Options/impact or reason | Outcome | Evidence |
|---|---|---|---|---|

## Common failures and Plan B

- **Hidden shared-file overlap:** pause; re-slice ownership before parallel edits.
- **Task exposes a product gap:** mark `BLOCKED` and return to the spec gate.
- **Configured check is unavailable:** record the failure; use the agreed local or
  trainer-owned fallback, but do not claim the original check passed.
- **Plan no longer fits the code:** document evidence and request plan re-approval;
  do not silently expand scope.
