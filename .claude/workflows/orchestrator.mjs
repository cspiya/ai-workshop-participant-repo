export const meta = {
  name: "orchestrator",
  description:
    "Multi-task, parallel-develop + serialized-integrate v3 of the Linear-driven delivery loop (docs/agentic-operating-model.md §4). An OUTER drain-then-stop loop repeats picker rounds — each round picks up to MAX_MAKERS eligible Todo issues in the Mini CRM project (a defensive .slice(0, MAX_MAKERS) caps the picker's output in code), develops them CONCURRENTLY (each maker in its own isolated worktree on branch agent/<ISSUE-ID>, each adjudicated by an independent fresh-context reviewer with a per-task bounce loop), then integrates PASSED branches into main ONE AT A TIME (serialized merge + re-gate + push + Done), bouncing only the failing task on a conflict or red gate without blocking the others. The run repeats rounds until the picker returns no eligible work (drained) OR the cumulative attempted-task count reaches PER_RUN_TASK_CAP, then stops cleanly. An agent CRASH (agent() returns null) is RETRIED up to RETRY times, then the task is set Blocked/Needs-human and the run CONTINUES — it never hangs and never treats a crash as a normal verdict. A true per-agent wall-clock timeout is N/A (the agent() hook exposes no timeout option); the null-return crash handling is the resilience mechanism. Pass args.dryRun=true to run ONLY the picker and log every chosen task plus the intended plan with no side effects (no state writes, no dispatch, no merge).",
  phases: [
    {
      title: "Pick",
      detail:
        "Query Linear for up to MAX_MAKERS eligible Todo issues (state Todo, no open blockedBy, not already in flight) in the Mini CRM project, ordered by priority then createdAt."
    },
    {
      title: "Develop",
      detail:
        "Develop the picked tasks concurrently: each runs its own per-task pipeline — set In Progress, dispatch a maker in an isolated worktree on branch agent/<ISSUE-ID>, have an independent fresh-context reviewer adjudicate, and bounce the same maker up to the limit — so a fast task's review proceeds while others still build."
    },
    {
      title: "Integrate",
      detail:
        "Serialize integration: merge PASSED branches into main one at a time, re-run the full gate on main, push, delete the branch and mark the issue Done with evidence; a conflict or red gate bounces only that task (Changes Requested + resume its maker, counting toward its bounce limit) without blocking or failing the other tasks."
    }
  ]
};

// --- Configuration (defaults from docs/orchestrator/config.md §"Limits"; overridable via args) ---
// All limits are read from CONFIG (seeded from the config.md defaults, each overridable via an
// args.<name>), never hard-coded at the call sites. Source of the default values:
// docs/orchestrator/config.md — MAX_MAKERS=3, BOUNCE_LIMIT=2, PER_RUN_TASK_CAP=10, RETRY=1,
// AGENT_TIMEOUT=20m.
const CONFIG = {
  projectId: (args && args.projectId) || "5b4c1325-ebce-470c-939d-18db3ee2274a",
  projectName: "Mini CRM (ai-workshop-participant-repo)",
  teamId: (args && args.teamId) || "cbff54b7-1224-4def-af34-249ce3e87113",
  maxMakers:
    args && typeof args.maxMakers === "number" ? args.maxMakers : 3,
  bounceLimit:
    args && typeof args.bounceLimit === "number" ? args.bounceLimit : 2,
  // PER_RUN_TASK_CAP (config.md default 10): the maximum number of tasks a single orchestrator run
  // will ATTEMPT. The outer drain loop repeats picker rounds (each up to MAX_MAKERS) until the
  // picker returns no eligible work OR the cumulative attempted count reaches this cap.
  perRunTaskCap:
    args && typeof args.perRunTaskCap === "number" ? args.perRunTaskCap : 10,
  // RETRY (config.md default 1): how many times a task's develop/integration pipeline is retried
  // after an agent CRASH (an agent() hook returned null — the agent died) before the task is set to
  // Blocked/Needs-human. A crash is NOT treated as a normal review verdict.
  retry:
    args && typeof args.retry === "number" ? args.retry : 1,
  // AGENT_TIMEOUT (config.md default 20m): recorded for documentation ONLY. The Workflow runtime's
  // agent() hook exposes NO timeout option, so a true per-agent wall-clock timeout is NOT
  // implementable in-script (N/A — runtime limitation; see docs/handoffs/WEN-363.md). The
  // resilience mechanism is instead the null-return CRASH handling in withCrashRetry() below: a
  // hung agent that the runtime eventually abandons surfaces as a null return, which is retried up
  // to CONFIG.retry times and then escalated. This field is never read for control flow.
  agentTimeoutMinutes:
    args && typeof args.agentTimeoutMinutes === "number" ? args.agentTimeoutMinutes : 20,
  labels: {
    inReview: "agent:in-review",
    changesRequested: "agent:changes-requested",
    needsHuman: "agent:needs-human"
  }
};

const dryRun = !!(args && args.dryRun);

// --- Evidence / escalation literals (pure constants — no Date/Math.random/FS) ---
// The named human product owner who resolves every agent:needs-human escalation
// (docs/agentic-operating-model.md §9 — only a human unblocks Blocked/Needs-human).
const HUMAN_OWNER = "Csaba Piya (product owner)";
// The git-linked production Vercel deploy. Pushing the merge commit to main triggers
// an auto-deploy here; the specific deploy for a given SHA may still be building when
// the integrator posts its Done evidence, so the comment notes that explicitly.
const PROD_DEPLOY_URL = "https://ai-workshop-participant-repo-sand.vercel.app";

// --- JSON Schemas for validated agent() returns ---
// Picker now returns an ARRAY of up to MAX_MAKERS eligible tasks (or {none:true}).
const PICKER_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    none: { type: "boolean" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          identifier: { type: "string" },
          url: { type: "string" },
          title: { type: "string" },
          priority: { type: "number" },
          createdAt: { type: "string" }
        }
      }
    }
  },
  required: ["none"]
};

const MAKER_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    status: { type: "string", enum: ["DONE", "NOT_DEVELOPABLE", "BLOCKED"] },
    perAC: { type: "array" },
    gates: { type: "object" },
    branch: { type: "string" },
    sha: { type: "string" },
    handoffPath: { type: "string" },
    assumptions: { type: "string" },
    reason: { type: "string" }
  },
  required: ["status"]
};

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    verdict: { type: "string", enum: ["PASS", "CHANGES-REQUESTED"] },
    critical: { type: "array" },
    serious: { type: "array" },
    minor: { type: "array" }
  },
  required: ["verdict"]
};

const INTEG_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    result: { type: "string", enum: ["MERGED", "CONFLICT", "GATE_RED"] },
    sha: { type: "string" },
    gates: { type: "object" },
    note: { type: "string" }
  },
  required: ["result"]
};

const STATE_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: { ok: { type: "boolean" }, note: { type: "string" } },
  required: ["ok"]
};

// --- Concurrency helper -----------------------------------------------------
// Develop fan-out uses the Workflow runtime's parallel() when it is provided as
// a global (per docs/agentic-operating-model-plan.md), and falls back to
// Promise.all otherwise. `typeof parallel` is safe even when parallel is not a
// declared global — it evaluates to "undefined" rather than throwing. The
// convention assumed here is parallel(arrayOfThunks); each thunk is a
// zero-arg function returning a Promise, so a fast task's pipeline resolves
// while slower ones are still running.
async function fanOut(thunks) {
  if (!thunks.length) return [];
  if (typeof parallel === "function") {
    return await parallel(thunks);
  }
  return await Promise.all(thunks.map((fn) => fn()));
}

// --- Prompt builders (concise; the maker/reviewer contracts live inline because
//     these agents are dispatched as the built-in general-purpose agent) -------
function pickerPrompt() {
  return [
    "You are the orchestrator's PICKER. Load the Linear MCP tools first (ToolSearch: mcp__linear__*), then read only — do NOT change any issue state or label.",
    `Scope: the Mini CRM project ONLY — project id ${CONFIG.projectId} (${CONFIG.projectName}), team id ${CONFIG.teamId}.`,
    "Eligibility (docs/agentic-operating-model.md §3):",
    "  - workflow state == \"Todo\", AND",
    "  - no OPEN blockedBy relation (every blocking issue is Done), AND",
    "  - not already in flight (does NOT carry label agent:in-review or agent:changes-requested).",
    "Also EXCLUDE any issue carrying label agent:needs-human.",
    "Order the eligible set by PRIORITY first (Urgent > High > Medium > Low > None; note Linear numeric priority 1=Urgent is highest, 0=None is lowest), then by createdAt ASCENDING.",
    `Take the TOP ${CONFIG.maxMakers} eligible issues (fewer if fewer are eligible).`,
    "Return JSON: if none eligible -> {\"none\": true}. Otherwise {\"none\": false, \"tasks\": [ {\"id\", \"identifier\", \"url\", \"title\", \"priority\", \"createdAt\"}, ... ]} listing the chosen issues in that priority-then-createdAt order — at most " +
      CONFIG.maxMakers +
      " entries."
  ].join("\n");
}

function makerPrompt(picked, resumeText) {
  // The full MAKER contract is inlined here because this agent is dispatched as the
  // built-in general-purpose agent, which carries NO maker system prompt. Everything a
  // maker needs to act correctly must live in this string.
  const base = [
    `Task: ${picked.identifier} — ${picked.url}`,
    "You are a MAKER agent. You implement exactly ONE task, dispatched by the orchestrator. The Linear issue is the executable spec; your isolated git worktree is your sandbox. You do NOT write Linear state and you do NOT merge to main — you implement, gate, hand off, and push a branch on branch agent/" +
      picked.identifier +
      ". An independent fresh-context reviewer and the orchestrator do the rest. You may use the Linear MCP tools (ToolSearch: mcp__linear__*) ONLY to READ the issue — never to change any state or label.",
    "",
    "1. READ THE SPEC BEFORE WRITING ANYTHING:",
    "  - Read AGENTS.md (and CLAUDE.md) at the repo root — the rules there are binding: the locked stack, the visual/design guideline (DESIGN-GUIDELINE.md), the 'keep it simple / no unapproved libraries' rule, and the CI gate.",
    "  - Read the Linear issue " +
      picked.identifier +
      " (" +
      picked.url +
      "): its description and acceptance criteria ARE the spec. Treat every acceptance criterion as a checklist item you must satisfy.",
    "  - If docs/spec-package/ contains an APPROVED package covering this slice, follow it as the contract (constitution, approved spec, approved plan, given-when-then, tasks matrix).",
    "  - Read docs/handoffs/README.md for the handoff convention and template.",
    "",
    "2. DEVELOPABILITY CHECK (before implementing): Decide whether the task has clear scope and acceptance criteria, with no missing product decision and no unmet dependency. If it is NOT developable — ambiguous, needs a human/product decision, or depends on work that is not done — STOP and return status NOT_DEVELOPABLE with the EXACT blocking question in `reason`. Do NOT invent product behavior, enum values, copy, schema, or scope to fill a gap. When in doubt, escalate rather than guess.",
    "",
    "3. IMPLEMENT — ONLY within this task's scope:",
    "  - Implement to satisfy the acceptance criteria, following the locked stack and rules in AGENTS.md. Prefer editing existing files over creating new ones.",
    "  - Do NOT touch files outside this task's scope. Do NOT add libraries, patterns, or abstractions beyond what AGENTS.md approves; anything else needs human sign-off.",
    "  - Validate every mutation input with the entity's Zod schema before touching the DB; use only the enum values defined in the spec — never invent new ones.",
    "  - Never commit secrets (e.g. DATABASE_URL); they live in gitignored .env.",
    "",
    "4. RUN THE FULL GATE and fix until green: npm run typecheck && npm run lint && npm run test && npm run build. Capture each stage's exit code. Do NOT hand off on a red gate — if you cannot get it green, return status BLOCKED with the failing stage and reason rather than pushing broken work.",
    "",
    "5. WRITE THE HANDOFF AND COMMIT ON YOUR BRANCH:",
    "  - Write docs/handoffs/" +
      picked.identifier +
      ".md using the exact template in docs/handoffs/README.md (scope/files changed, per-AC status with evidence, gate exit codes, decisions/assumptions, known risks, how-to-verify steps).",
    "  - Commit all your work on branch agent/" +
      picked.identifier +
      " (create it if the worktree is not already on it). Commit message in English; end it with: Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>",
    "  - Push the branch: git push -u origin agent/" +
      picked.identifier +
      ".",
    "  - Do NOT merge to main. Do NOT change any Linear issue state or apply Linear labels — the orchestrator owns state transitions, and an independent reviewer adjudicates your work. Do not review or approve your own work.",
    "",
    "6. RETURN A STRUCTURED RESULT the orchestrator can parse: {status, perAC, gates, branch, sha, handoffPath, assumptions, reason} where status is DONE | NOT_DEVELOPABLE | BLOCKED; perAC lists each acceptance criterion with PASS/FAIL/N-A and one line of evidence; gates lists the four gate commands with their exit codes; branch is agent/" +
      picked.identifier +
      "; sha is the commit SHA you pushed (or 'see branch head'); handoffPath is docs/handoffs/" +
      picked.identifier +
      ".md; assumptions holds any assumptions/risks and — for NOT_DEVELOPABLE/BLOCKED — the exact blocking question or failing reason. Keep the result factual and self-contained."
  ];
  if (resumeText) {
    base.push(
      "",
      "This is a RESUME of your earlier work on this branch. Address EXACTLY the following, then re-run the full gate and push again:",
      resumeText
    );
  }
  return base.join("\n");
}

function reviewerPrompt(picked, branch) {
  // The full REVIEWER contract is inlined here because this agent is dispatched as the
  // built-in general-purpose agent, which carries NO reviewer system prompt. It MUST behave
  // strictly read-only: it may READ git and Linear, but never fixes code or changes any state.
  return [
    `Review target: issue ${picked.identifier} — ${picked.url}.`,
    `Branch under review: ${branch} (diff vs main). Handoff: docs/handoffs/${picked.identifier}.md.`,
    "You are an independent REVIEWER agent with FRESH context. You have no memory of how the work was produced — you did not write it, and you do not trust any claim in it until you have verified it yourself. Your single job is to adversarially adjudicate this work against the task's contract and return a structured verdict with severity-classified findings. You are the invariant that 'an agent never approves itself'. You DO NOT fix anything and you DO NOT change any git or Linear state — you only produce a verdict; the orchestrator acts on it. You may load the Linear MCP tools (ToolSearch: mcp__linear__*) but ONLY to READ the issue.",
    "",
    "INPUTS: the Linear issue " +
      picked.identifier +
      " (its description and acceptance criteria — the contract you review against), the handoff file docs/handoffs/" +
      picked.identifier +
      ".md (the maker's evidence trail), and the diff on branch " +
      branch +
      " versus main. If the issue's acceptance criteria are not in this prompt, read them from the Linear issue. If the handoff file or the branch is missing, that is itself a CRITICAL finding (the work is not reviewable / not delivered).",
    "",
    "HOW TO INSPECT (READ-ONLY): inspect the branch WITHOUT modifying the repository. NEVER checkout, merge, commit, reset, push, or edit any file. Use read-only git inspection only, e.g.:",
    "  git fetch origin --quiet",
    "  git diff origin/main...origin/" + branch + "        # the full change set under review",
    "  git diff --stat origin/main...origin/" + branch + "  # scope overview",
    "  git log --oneline origin/main..origin/" + branch + "  # commits on the branch",
    "  git show <SHA>                                        # inspect a specific commit",
    "  git show origin/" + branch + ":<path>                 # read a file at the branch tip",
    "You may read any file, run Grep/Glob, and run the repo gate commands read-only (npm run typecheck && npm run lint && npm run test && npm run build) to confirm they are truly green. You must not create, edit, or delete files, and must not alter git or Linear state in any way.",
    "",
    "WHAT TO VERIFY (be adversarial — try to REFUTE, not confirm): for EACH acceptance criterion, do not accept the handoff's 'met' claim at face value; actively construct a concrete scenario in which it FAILS, and only when you cannot refute it does it count as met. Check at least: every AC is actually met (trace each to concrete evidence in the diff — a claim without verifiable evidence is not met); no scope creep (diff stays within scope, no unrelated files, no unapproved libraries/patterns per AGENTS.md); gates truly green (typecheck, lint, test, build all pass and match the handoff's exit codes); no secret committed (no DATABASE_URL, .env contents, tokens); validation guards every mutation (inputs validated against the entity's schema before persistence); enum/contract values match the spec (no invented enum values); error and edge paths handled (empty, invalid, boundary, failure inputs — not just the happy path). Ground every finding in a concrete failing scenario or a specific diff location — never a vague concern.",
    "",
    "SEVERITY TAXONOMY (classify every finding): CRITICAL — a broken/unmet acceptance criterion, data loss, a security/secret defect, a red gate, or scope overreach beyond the repo's boundaries (→ bounce). SERIOUS — the AC is formally met but there is a significant defect: wrong behavior in a real-world case, missing validation, an enum/contract violation, or an unhandled error branch (→ bounce). MINOR — style, naming, small UX, non-blocking (→ does NOT bounce; recorded only).",
    "",
    "VERDICT: PASS only when there is NO Critical and NO Serious finding (Minor findings may still exist); otherwise CHANGES-REQUESTED.",
    "",
    "OUTPUT — return a single structured object: {verdict: \"PASS\" | \"CHANGES-REQUESTED\", critical: [{ac, finding, scenario}], serious: [{ac, finding, scenario}], minor: [{area, finding}]}. verdict is PASS only when both critical and serious are empty. Every Critical/Serious finding must include a concrete failing scenario or exact diff location — enough for the same maker to reproduce and fix it. Do NOT fix anything. Do NOT change any git or Linear state. Do NOT merge. Produce the verdict only."
  ].join("\n");
}

function integratorPrompt(picked, branch, makerResult) {
  return [
    "You are the orchestrator's INTEGRATOR. Use Bash for git and load the Linear MCP (ToolSearch: mcp__linear__*) for the Linear write. You are the ONLY serialized merge into main — the orchestrator guarantees no other integrator runs concurrently, so you own main exclusively for this call.",
    `Integrate branch ${branch} into main for issue ${picked.identifier} (${picked.url}). Maker-reported head SHA: ${makerResult && makerResult.sha ? makerResult.sha : "see branch head"}.`,
    "Steps:",
    "1. git fetch origin --prune; check out main and fast-forward it to origin/main (git checkout main && git pull --ff-only).",
    `2. Merge the branch: git merge --no-ff origin/${branch}. If it CONFLICTS, run git merge --abort and STOP — return {\"result\":\"CONFLICT\",\"note\":\"<conflicting files>\"}.`,
    "3. Re-run the FULL gate on the merged main: npm run typecheck && npm run lint && npm run test && npm run build. Capture each stage's exit code. If ANY stage is non-zero, run git reset --hard origin/main and STOP — return {\"result\":\"GATE_RED\",\"gates\":{\"typecheck\":n,\"lint\":n,\"test\":n,\"build\":n},\"note\":\"<failing stage>\"}.",
    "4. Green gate → git push origin main, then delete the merged branch: git push origin --delete " +
      branch +
      ".",
    `5. Via the Linear MCP (load mcp__linear__* with ToolSearch first, then use the create/save-comment tool): set issue ${picked.identifier} workflow state to \"Done\" (team ${CONFIG.teamId}) and remove the ${CONFIG.labels.inReview} and ${CONFIG.labels.changesRequested} labels if present.`,
    `6. Then POST AN EVIDENCE COMMENT on ${picked.identifier} via the Linear MCP (this comment is REQUIRED, not optional — the Done transition is not complete without it). The comment MUST contain, each on its own line:`,
    "     - Merge commit SHA on main: the exact merge commit SHA you created in step 2 (the commit now on origin/main).",
    "     - Gate exit codes: the four exit codes captured in step 3, written as `typecheck=<n> lint=<n> test=<n> build=<n>` (all 0 for a Done issue).",
    `     - Handoff: a link to docs/handoffs/${picked.identifier}.md (the maker's evidence trail).`,
    `     - Production deploy: ${PROD_DEPLOY_URL} — the git-linked Vercel auto-deploys on push to main, so note that this specific deploy (for the merge commit above) MAY STILL BE BUILDING at comment time.`,
    "   Do not omit any of the four fields; if the Vercel deploy URL for this exact commit is not yet resolvable, still include the production URL above and the 'may still be building' note.",
    "Return {\"result\":\"MERGED\"|\"CONFLICT\"|\"GATE_RED\", \"sha\":\"<merge commit>\", \"gates\":{...}, \"note\":\"<summary>\"}."
  ].join("\n");
}

// --- Helpers ---
function summarizeFindings(review) {
  if (!review) return "Reviewer returned no verdict (agent died).";
  const fmt = (arr, tag) =>
    (arr || []).map(
      (f) =>
        tag +
        ": " +
        (f.ac || f.area || "") +
        " — " +
        (f.finding || "") +
        (f.scenario ? " (" + f.scenario + ")" : "")
    );
  const lines = [...fmt(review.critical, "CRITICAL"), ...fmt(review.serious, "SERIOUS")];
  return lines.length ? lines.join("\n") : "CHANGES-REQUESTED with no itemised findings.";
}

async function setLinearState({ issue, state, label, note }) {
  const lifecycle = [
    CONFIG.labels.inReview,
    CONFIG.labels.changesRequested,
    CONFIG.labels.needsHuman
  ];
  const keep = label ? [label] : [];
  const remove = lifecycle.filter((l) => keep.indexOf(l) === -1);
  const prompt = [
    "You are the orchestrator's Linear STATE agent. Load the Linear MCP (ToolSearch: mcp__linear__*) and apply exactly the changes below — nothing else.",
    `Issue: ${issue.identifier} (id ${issue.id}${issue.url ? ", " + issue.url : ""}), team id ${CONFIG.teamId}.`,
    state ? `Set the issue workflow state to "${state}".` : "Leave the workflow state unchanged.",
    label ? `Ensure the label "${label}" is present on the issue.` : "Do not add any lifecycle label.",
    `Remove these labels if present: ${remove.join(", ")}.`,
    note ? `Post a short comment on the issue: ${note}` : "Do not post a comment.",
    'Return {"ok": true} on success (or {"ok": false, "note": "<what failed>"}).'
  ].join("\n");
  const res = await agent(prompt, {
    label: "state:" + issue.identifier,
    phase: "state",
    schema: STATE_SCHEMA
  });
  if (!res || !res.ok) {
    log("WARNING: Linear state update may have failed for " + issue.identifier);
  }
  return res;
}

// Escalate a task to a human. EVERY terminal escalation path routes through here
// (NOT_DEVELOPABLE, review bounce-limit exceeded, maker-cannot-comply, agent
// crash-after-RETRY, integration conflict/red-gate exceeding the bounce limit), so
// each one BOTH sets the agent:needs-human label AND posts a Linear comment that
// states the EXACT blocking reason / the reviewer's Critical+Serious findings (or
// the crash/conflict reason) passed in via `note`, and NAMES the human owner who
// must resolve it. The label alone is not enough — the comment is the audit trail.
async function escalate(item, note) {
  const comment = [
    `ESCALATION — ${item.id} is BLOCKED and needs a human decision.`,
    "",
    "Blocking reason / findings:",
    note,
    "",
    `Owner: ${HUMAN_OWNER}. This issue now carries label ${CONFIG.labels.needsHuman}; per docs/agentic-operating-model.md §9 only a human resolves a Blocked/Needs-human task — the orchestrator will not re-pick it.`
  ].join("\n");
  await setLinearState({
    issue: item.task,
    label: CONFIG.labels.needsHuman,
    note: comment
  });
}

function blocked(item, reason, extra) {
  return {
    state: "BLOCKED",
    item,
    summary: Object.assign(
      { id: item.id, status: "BLOCKED", reason, bounces: item.bounces },
      extra || {}
    )
  };
}

// A per-task pipeline reports an agent CRASH by returning this marker (state
// "CRASHED") whenever an agent() hook returns null — i.e. the maker/reviewer
// agent DIED rather than producing a result. A crash is deliberately kept
// DISTINCT from a normal review verdict or a compliance BLOCKED: it must never
// be silently treated as a CHANGES-REQUESTED bounce. withCrashRetry() catches
// this marker and retries the whole pipeline up to CONFIG.retry times.
function crashed(item, why) {
  return { state: "CRASHED", item, why };
}

// Runs one task's pipeline thunk, retrying up to CONFIG.retry (RETRY, config.md
// default 1) times when the pipeline reports an agent CRASH (crashed(): an
// agent() hook returned null, so the agent died). The crash is NOT counted as a
// bounce and NOT treated as a verdict. When RETRY is exhausted the task is set to
// agent:needs-human (Blocked) with a reason and a blocked() result is returned so
// the CALLER CONTINUES with the other tasks — the run never hangs and one crashed
// agent never fails the others. NOTE on per-agent timeout: the Workflow agent()
// hook exposes NO timeout option, so a true wall-clock per-agent timeout is
// N/A — a runtime limitation (see docs/handoffs/WEN-363.md). This null-return
// retry IS the resilience mechanism: a hung agent the runtime eventually abandons
// surfaces here as a null return and is retried, then escalated.
async function withCrashRetry(pipelineThunk, phaseLabel) {
  let retries = 0;
  while (true) {
    const res = await pipelineThunk();
    if (!res || res.state !== "CRASHED") {
      return res; // READY or blocked() — a normal (non-crash) outcome.
    }
    if (retries >= CONFIG.retry) {
      await escalate(
        res.item,
        `Agent crash in ${phaseLabel} for ${res.item.id} still failing after ${CONFIG.retry} RETRY (${res.why}). Escalating to needs-human.`
      );
      return blocked(res.item, "agent-crash", { detail: res.why });
    }
    retries += 1;
    log(
      `RETRY ${retries}/${CONFIG.retry} for ${res.item.id} after agent crash in ${phaseLabel}: ${res.why}`
    );
  }
}

// Run the review -> bounce loop for one task. Mutates item.bounces / item.maker.
// Returns {state:'READY', item} once a reviewer PASSes, or a blocked() result
// when the per-task bounce limit is exceeded or the maker cannot comply.
async function runReviewLoop(item) {
  while (true) {
    await setLinearState({
      issue: item.task,
      label: CONFIG.labels.inReview,
      note: "Orchestrator: dispatching independent reviewer for " + item.id + "."
    });
    const review = await agent(reviewerPrompt(item.task, item.branch), {
      label: "reviewer:" + item.id,
      phase: "Develop",
      agentType: "general-purpose",
      schema: REVIEW_SCHEMA
    });
    if (!review) {
      // Reviewer agent DIED (null return) — this is a CRASH, not a verdict. Do
      // NOT bounce (that would silently treat a dead agent as CHANGES-REQUESTED).
      // Bubble up so withCrashRetry() retries the pipeline, then escalates.
      return crashed(item, "reviewer agent died (null return) reviewing " + item.id);
    }
    if (review.verdict === "PASS") {
      return { state: "READY", item };
    }
    item.bounces += 1;
    const findings = summarizeFindings(review);
    if (item.bounces > CONFIG.bounceLimit) {
      await escalate(
        item,
        `Bounce limit (${CONFIG.bounceLimit}) exceeded for ${item.id}. Findings:\n${findings}`
      );
      return blocked(item, "review-bounce-limit", { findings });
    }
    await setLinearState({
      issue: item.task,
      label: CONFIG.labels.changesRequested,
      note: `Review round ${item.bounces}: CHANGES-REQUESTED — resuming the same maker for ${item.id}.`
    });
    const maker = await agent(
      makerPrompt(item.task, "Reviewer findings to fix:\n" + findings),
      {
        label: "maker:" + item.id + ":fix" + item.bounces,
        phase: "Develop",
        agentType: "general-purpose",
        isolation: "worktree",
        schema: MAKER_SCHEMA
      }
    );
    if (!maker) {
      // Maker agent DIED (null return) fixing the branch — a CRASH, not a
      // compliance failure. Bubble up for RETRY rather than escalating directly.
      return crashed(item, "maker agent died (null return) fixing " + item.id);
    }
    if (maker.status !== "DONE") {
      await escalate(
        item,
        "Maker could not complete the requested changes for " + item.id + ". Escalating."
      );
      return blocked(item, "maker-failed-on-changes");
    }
    item.maker = maker;
    // loop -> re-review the fixed branch
  }
}

// Per-task DEVELOP pipeline (runs concurrently across tasks): In Progress ->
// maker (own worktree + branch) -> review/bounce loop. Returns {state:'READY'}
// (ready to integrate) or a blocked() result.
async function developTask(task) {
  const item = {
    task,
    id: task.identifier,
    branch: "agent/" + task.identifier,
    bounces: 0,
    maker: null
  };
  await setLinearState({
    issue: task,
    state: "In Progress",
    label: null,
    note: "Orchestrator: starting work (parallel run)."
  });

  const maker = await agent(makerPrompt(task, null), {
    label: "maker:" + item.id,
    phase: "Develop",
    agentType: "general-purpose",
    isolation: "worktree",
    schema: MAKER_SCHEMA
  });

  if (!maker) {
    // Maker agent DIED (null return) before returning a result — a CRASH. Bubble
    // up so withCrashRetry() retries the whole develop pipeline (fresh maker) up
    // to CONFIG.retry times, then escalates to needs-human.
    return crashed(item, "maker agent died (null return) before returning a result for " + item.id);
  }
  if (maker.status === "NOT_DEVELOPABLE" || maker.status === "BLOCKED") {
    const reason = maker.reason || maker.assumptions || "see handoff / maker result";
    await escalate(item, `Maker ${maker.status} for ${item.id}: ${reason}`);
    return blocked(item, maker.status, { detail: reason });
  }

  item.branch = maker.branch || item.branch;
  item.maker = maker;
  return await runReviewLoop(item);
}

// Resume a task whose integration failed: fix on the branch, then re-review.
// Returns {state:'READY', item} (re-queue for a serialized merge attempt) or a
// blocked() result. Runs concurrently across bounced tasks between merge passes.
async function reintegrateFix(item) {
  const maker = await agent(
    makerPrompt(
      item.task,
      "Resolve this integration failure so the branch merges cleanly into main and the full gate is green on the merged main:\n" +
        (item.lastWhy || "integration failed")
    ),
    {
      label: "maker:" + item.id + ":integ-fix" + item.bounces,
      phase: "Integrate",
      agentType: "general-purpose",
      isolation: "worktree",
      schema: MAKER_SCHEMA
    }
  );
  if (!maker) {
    // Maker agent DIED (null return) resolving the integration failure — a CRASH.
    // Bubble up for RETRY rather than escalating directly.
    return crashed(item, "maker agent died (null return) resolving integration for " + item.id);
  }
  if (maker.status !== "DONE") {
    await escalate(item, "Maker could not resolve the integration failure for " + item.id + ". Escalating.");
    return blocked(item, "maker-failed-on-integration-fix");
  }
  item.maker = maker;
  item.branch = maker.branch || item.branch;
  return await runReviewLoop(item);
}

// Run ONE picker round's worth of tasks end-to-end: develop them CONCURRENTLY
// (each per-task pipeline wrapped in withCrashRetry so a dead agent is retried
// then escalated, never treated as a verdict) and then SERIALIZE integration —
// merge PASSED branches into main one at a time, re-gate, push, Done; a
// conflict / red gate bounces ONLY that task without blocking the others.
// Returns an array of finished summaries for the round. Unchanged from v2 apart
// from the withCrashRetry wrappers; factored into a function so the outer
// drain-then-stop loop can invoke it once per round.
async function runRound(roundTasks) {
  const finished = [];

  // Develop all round tasks CONCURRENTLY (each its own per-task pipeline).
  phase("Develop");
  const devResults = await fanOut(
    roundTasks.map((t) => () => withCrashRetry(() => developTask(t), "develop"))
  );
  let queue = [];
  for (const r of devResults) {
    if (r && r.state === "READY") {
      queue.push(r.item);
    } else if (r && r.summary) {
      finished.push(r.summary);
    } else {
      finished.push({ id: "unknown", status: "BLOCKED", reason: "develop-returned-null" });
    }
  }
  log(`develop complete: ${queue.length} ready to integrate, ${finished.length} blocked/escalated.`);

  // Integrate — SERIALIZED. Merge PASSED branches into main one at a time.
  // A conflict / red gate bounces ONLY that task (resume its maker, re-review,
  // re-queue) without blocking or failing the others. Rework between merge
  // passes runs concurrently; the merges themselves never overlap.
  phase("Integrate");
  while (queue.length) {
    const toRework = [];
    for (const item of queue) {
      const integ = await agent(integratorPrompt(item.task, item.branch, item.maker), {
        label: "integrator:" + item.id,
        phase: "Integrate",
        schema: INTEG_SCHEMA
      });

      if (integ && integ.result === "MERGED") {
        log(`integrated ${item.id} -> main (${integ.sha || "merge commit"}); issue Done.`);
        finished.push({
          id: item.id,
          status: "DONE",
          sha: integ.sha || null,
          bounces: item.bounces
        });
        continue;
      }

      // Conflict or red gate on integration -> counts toward this task's bounce limit.
      item.bounces += 1;
      const why = integ
        ? integ.result + (integ.note ? ": " + integ.note : "")
        : "integrator agent died";
      if (item.bounces > CONFIG.bounceLimit) {
        await escalate(
          item,
          `Integration still failing after ${CONFIG.bounceLimit} bounces for ${item.id} (${why}). Escalating.`
        );
        finished.push({
          id: item.id,
          status: "BLOCKED",
          reason: "integration-bounce-limit",
          detail: why,
          bounces: item.bounces
        });
        continue;
      }
      await setLinearState({
        issue: item.task,
        label: CONFIG.labels.changesRequested,
        note: `Integration ${why} for ${item.id} — resuming maker (bounce ${item.bounces}/${CONFIG.bounceLimit}).`
      });
      item.lastWhy = why;
      toRework.push(item);
    }

    if (!toRework.length) break;

    // Rework the bounced tasks concurrently; those that pass review re-enter the
    // serialized merge queue for the next pass.
    const reworked = await fanOut(
      toRework.map((item) => () => withCrashRetry(() => reintegrateFix(item), "integration"))
    );
    const next = [];
    for (const r of reworked) {
      if (r && r.state === "READY") {
        next.push(r.item);
      } else if (r && r.summary) {
        finished.push(r.summary);
      } else {
        finished.push({ id: "unknown", status: "BLOCKED", reason: "reintegrate-returned-null" });
      }
    }
    queue = next;
  }

  return finished;
}

// ============================ ORCHESTRATOR RUN ============================

// DRY RUN — a single picker round: log ALL chosen tasks and the plan, then stop
// with no side effects (no state writes, no maker/reviewer/integrator dispatch,
// no merge). The defensive slice(0, MAX_MAKERS) still applies so the dry-run
// preview never lists more than the concurrency cap.
if (dryRun) {
  phase("Pick");
  const pickedDry = await agent(pickerPrompt(), {
    label: "picker",
    phase: "Pick",
    schema: PICKER_SCHEMA
  });
  const dryTasks = (
    pickedDry && !pickedDry.none && Array.isArray(pickedDry.tasks) ? pickedDry.tasks : []
  ).slice(0, CONFIG.maxMakers);
  if (!dryTasks.length) {
    log("no eligible work");
    return { status: "NO_ELIGIBLE_WORK", dryRun: true, tasks: [] };
  }
  log(`DRY RUN — no side effects. ${dryTasks.length} eligible task(s) this round, parallel-develop + serialized-integrate plan:`);
  for (const t of dryTasks) {
    log(`  - ${t.identifier} (priority ${t.priority}, created ${t.createdAt}) — ${t.title} -> branch agent/${t.identifier}`);
  }
  log(`  Develop: all ${dryTasks.length} CONCURRENTLY (maker general-purpose + worktree, then independent reviewer, bounce <= ${CONFIG.bounceLimit}).`);
  log(`  Integrate: SERIALIZED — merge PASSED branches into main one at a time, re-gate, push, Done + evidence; conflict/red gate bounces only that task.`);
  log(`  Run bound: OUTER drain-then-stop loop repeats picker rounds until no eligible work OR PER_RUN_TASK_CAP=${CONFIG.perRunTaskCap} attempted; agent crash retried <= RETRY=${CONFIG.retry} then Blocked/Needs-human.`);
  return {
    status: "DRY_RUN",
    dryRun: true,
    count: dryTasks.length,
    maxMakers: CONFIG.maxMakers,
    bounceLimit: CONFIG.bounceLimit,
    perRunTaskCap: CONFIG.perRunTaskCap,
    retry: CONFIG.retry,
    tasks: dryTasks.map((t) => ({
      identifier: t.identifier,
      id: t.id,
      url: t.url,
      title: t.title,
      priority: t.priority,
      createdAt: t.createdAt,
      plannedBranch: "agent/" + t.identifier
    }))
  };
}

// LIVE — OUTER drain-then-stop loop. Repeat picker rounds (each up to MAX_MAKERS)
// until the picker returns no eligible work (drained) OR the cumulative number of
// ATTEMPTED tasks reaches PER_RUN_TASK_CAP. Each round's picker naturally cannot
// re-pick tasks already handled: runRound() fully resolves every task to Done
// (leaves Todo) or Blocked/Needs-human (carries agent:needs-human, which the
// picker excludes) before the next round's picker runs, so no task is attempted
// twice. Then stop cleanly with a summary log stating how many were processed and
// why the run stopped (cap reached vs drained).
const finished = [];
let attempted = 0;
let completedRounds = 0;
let pickerRounds = 0;
let stopReason = "drained";
while (true) {
  if (attempted >= CONFIG.perRunTaskCap) {
    stopReason = "cap-reached";
    break;
  }
  pickerRounds += 1;
  phase("Pick");
  const picked = await agent(pickerPrompt(), {
    label: "picker:round" + pickerRounds,
    phase: "Pick",
    schema: PICKER_SCHEMA
  });
  // Defensive cap: never develop more than MAX_MAKERS in a round, regardless of
  // what the picker returns (carry-forward from the O5 review — do not rely on
  // the picker prompt alone).
  const eligible = (
    picked && !picked.none && Array.isArray(picked.tasks) ? picked.tasks : []
  ).slice(0, CONFIG.maxMakers);
  if (!eligible.length) {
    stopReason = "drained";
    break;
  }
  // Respect PER_RUN_TASK_CAP: never ATTEMPT more than the remaining budget, so the
  // final round may run fewer than MAX_MAKERS to land exactly on the cap.
  const remaining = CONFIG.perRunTaskCap - attempted;
  const roundTasks = eligible.slice(0, remaining);
  attempted += roundTasks.length;
  log(
    `round ${pickerRounds}: attempting ${roundTasks.length} task(s) [${attempted}/${CONFIG.perRunTaskCap} attempted, cap MAX_MAKERS=${CONFIG.maxMakers}]: ` +
      roundTasks.map((t) => t.identifier).join(", ")
  );

  const roundFinished = await runRound(roundTasks);
  for (const f of roundFinished) finished.push(f);
  completedRounds += 1;
}

// Nothing was ever eligible: preserve the prior NO_ELIGIBLE_WORK contract.
if (attempted === 0) {
  log("no eligible work");
  return { status: "NO_ELIGIBLE_WORK", dryRun: false, tasks: [] };
}

const doneCount = finished.filter((f) => f.status === "DONE").length;
log(
  `drain-then-stop: processed ${attempted} task(s) across ${completedRounds} completed round(s); stopped — ` +
    (stopReason === "cap-reached"
      ? `PER_RUN_TASK_CAP=${CONFIG.perRunTaskCap} reached.`
      : "no eligible work remaining (drained).")
);
log(
  `orchestrator finished: ${doneCount}/${finished.length} DONE. ` +
    finished.map((f) => f.id + "=" + f.status).join(", ")
);

return finished;
