export const meta = {
  name: "orchestrator",
  description:
    "Single-task, sequential v1 of the Linear-driven delivery loop (docs/agentic-operating-model.md §4). Picks the top eligible Todo issue in the Mini CRM project, dispatches a maker in an isolated worktree, has a fresh-context reviewer adjudicate it, bounces up to the limit, then serial-merges the approved branch to main and marks the issue Done. Pass args.dryRun=true to run ONLY the picker and log the intended plan with no side effects (no state writes, no dispatch, no merge).",
  phases: [
    {
      title: "Pick",
      detail:
        "Query Linear for the single top eligible Todo issue (state Todo, no open blockedBy, not already in flight) in the Mini CRM project, ordered by priority then createdAt."
    },
    {
      title: "Make",
      detail:
        "Set the issue In Progress, then dispatch the maker agent in an isolated worktree to implement to the acceptance criteria, run the full gate green, and push branch agent/<ISSUE-ID>."
    },
    {
      title: "Review",
      detail:
        "Dispatch an independent fresh-context reviewer against the pushed branch; on Changes-Requested resume the same maker with the findings and re-review, up to the bounce limit, else escalate to needs-human."
    },
    {
      title: "Integrate",
      detail:
        "Serial-merge the approved branch into main, re-run the full gate, push main, delete the branch, mark the issue Done and record evidence; a conflict or red gate bounces the task back to the maker."
    }
  ]
};

// --- Configuration (defaults from docs/orchestrator/config.md; overridable via args) ---
const CONFIG = {
  projectId: (args && args.projectId) || "5b4c1325-ebce-470c-939d-18db3ee2274a",
  projectName: "Mini CRM (ai-workshop-participant-repo)",
  teamId: (args && args.teamId) || "cbff54b7-1224-4def-af34-249ce3e87113",
  bounceLimit:
    args && typeof args.bounceLimit === "number" ? args.bounceLimit : 2,
  labels: {
    inReview: "agent:in-review",
    changesRequested: "agent:changes-requested",
    needsHuman: "agent:needs-human"
  }
};

const dryRun = !!(args && args.dryRun);

// --- JSON Schemas for validated agent() returns ---
const PICKER_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    none: { type: "boolean" },
    id: { type: "string" },
    identifier: { type: "string" },
    url: { type: "string" },
    title: { type: "string" },
    priority: { type: "number" },
    createdAt: { type: "string" }
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

// --- Prompt builders (concise; the maker/reviewer contracts live in their agent defs) ---
function pickerPrompt() {
  return [
    "You are the orchestrator's PICKER. Load the Linear MCP tools first (ToolSearch: mcp__linear__*), then read only — do NOT change any issue state or label.",
    `Scope: the Mini CRM project ONLY — project id ${CONFIG.projectId} (${CONFIG.projectName}), team id ${CONFIG.teamId}.`,
    "Eligibility (docs/agentic-operating-model.md §3):",
    "  - workflow state == \"Todo\", AND",
    "  - no OPEN blockedBy relation (every blocking issue is Done), AND",
    "  - not already in flight (does NOT carry label agent:in-review or agent:changes-requested).",
    "Also EXCLUDE any issue carrying label agent:needs-human.",
    "Order the eligible set by PRIORITY first (Urgent > High > Medium > Low > None; note Linear numeric priority 1=Urgent is highest, 0=None is lowest), then by createdAt ASCENDING, and take the single TOP issue.",
    "Return JSON: if none eligible -> {\"none\": true}. Otherwise {\"none\": false, \"id\", \"identifier\", \"url\", \"title\", \"priority\", \"createdAt\"} for the chosen issue only."
  ].join("\n");
}

function makerPrompt(picked, resumeText) {
  const base = [
    `Task: ${picked.identifier} — ${picked.url}`,
    "You are dispatched as the MAKER. Your full contract is your agent definition (.claude/agents/maker.md) and docs/agentic-operating-model.md §6. Work ONLY inside your isolated worktree, on branch agent/" +
      picked.identifier +
      ".",
    "Implement the issue's acceptance criteria (the Linear issue is the spec), run the full gate green (npm run typecheck && npm run lint && npm run test && npm run build), write docs/handoffs/" +
      picked.identifier +
      ".md, commit, and push agent/" +
      picked.identifier +
      ".",
    "Do NOT change any Linear state or label, and do NOT merge to main — the orchestrator owns those.",
    "If the task is not developable (ambiguous / needs a product decision / unmet dependency), STOP and return status NOT_DEVELOPABLE with the exact blocking question in `reason` — do not invent behavior."
  ];
  if (resumeText) {
    base.push(
      "\nThis is a RESUME of your earlier work on this branch. Address EXACTLY the following, then re-run the full gate and push again:\n" +
        resumeText
    );
  }
  base.push(
    "Return the structured result {status, perAC, gates, branch, sha, handoffPath, assumptions, reason}."
  );
  return base.join("\n");
}

function reviewerPrompt(picked, branch) {
  return [
    `Review target: issue ${picked.identifier} — ${picked.url}.`,
    `Branch under review: ${branch} (diff vs main). Handoff: docs/handoffs/${picked.identifier}.md.`,
    "You are the independent, fresh-context REVIEWER. Your contract is your agent definition (.claude/agents/reviewer.md) and docs/agentic-operating-model.md §7.",
    "Fetch origin and inspect READ-ONLY (e.g. git diff origin/main...origin/" +
      branch +
      "). Do NOT checkout, merge, edit, or change any git or Linear state.",
    "Adversarially verify EVERY acceptance criterion (try to refute each 'met' claim); confirm the gate is truly green, no secret committed, mutations validated, enum/contract values correct, error/edge paths handled; classify findings Critical / Serious / Minor.",
    "Return {verdict: \"PASS\" | \"CHANGES-REQUESTED\", critical: [], serious: [], minor: []}. PASS only when there is no Critical and no Serious finding. Each Critical/Serious finding must carry a concrete failing scenario or exact diff location."
  ].join("\n");
}

function integratorPrompt(picked, branch, makerResult) {
  return [
    "You are the orchestrator's INTEGRATOR. Use Bash for git and load the Linear MCP (ToolSearch: mcp__linear__*) for the Linear write. You are the ONLY serialized merge into main.",
    `Integrate branch ${branch} into main for issue ${picked.identifier} (${picked.url}). Maker-reported head SHA: ${makerResult && makerResult.sha ? makerResult.sha : "see branch head"}.`,
    "Steps:",
    "1. git fetch origin --prune; check out main and fast-forward it to origin/main (git checkout main && git pull --ff-only).",
    `2. Merge the branch: git merge --no-ff origin/${branch}. If it CONFLICTS, run git merge --abort and STOP — return {\"result\":\"CONFLICT\",\"note\":\"<conflicting files>\"}.`,
    "3. Re-run the FULL gate on the merged main: npm run typecheck && npm run lint && npm run test && npm run build. Capture each stage's exit code. If ANY stage is non-zero, run git reset --hard origin/main and STOP — return {\"result\":\"GATE_RED\",\"gates\":{\"typecheck\":n,\"lint\":n,\"test\":n,\"build\":n},\"note\":\"<failing stage>\"}.",
    "4. Green gate → git push origin main, then delete the merged branch: git push origin --delete " +
      branch +
      ".",
    `5. Via Linear MCP: set issue ${picked.identifier} workflow state to \"Done\" (team ${CONFIG.teamId}); remove the ${CONFIG.labels.inReview} and ${CONFIG.labels.changesRequested} labels if present; and post an evidence COMMENT containing the merge commit SHA, the four gate exit codes, and a link to docs/handoffs/${picked.identifier}.md.`,
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

// ============================ ORCHESTRATOR RUN ============================

// 1. Pick
phase("Pick");
const picked = await agent(pickerPrompt(), {
  label: "picker",
  phase: "Pick",
  schema: PICKER_SCHEMA
});

if (!picked || picked.none) {
  log("no eligible work");
  return { status: "NO_ELIGIBLE_WORK", dryRun };
}
log(
  `picked ${picked.identifier} (priority ${picked.priority}, created ${picked.createdAt}) — ${picked.title}`
);

// 2. Dry-run: log the plan and stop with no side effects
if (dryRun) {
  log("DRY RUN — no side effects. Intended single-task pipeline:");
  log(`  1) Linear: ${picked.identifier} -> In Progress`);
  log(`  2) Make:   dispatch maker (agentType:maker, isolation:worktree) on branch agent/${picked.identifier}`);
  log(`  3) Review: dispatch reviewer (agentType:reviewer) on agent/${picked.identifier}; bounce up to ${CONFIG.bounceLimit} on CHANGES-REQUESTED (else agent:needs-human)`);
  log(`  4) Integrate: serial-merge agent/${picked.identifier} -> main, re-gate, push, ${picked.identifier} -> Done + evidence comment`);
  return {
    status: "DRY_RUN",
    picked: {
      identifier: picked.identifier,
      id: picked.id,
      url: picked.url,
      title: picked.title,
      priority: picked.priority,
      createdAt: picked.createdAt
    },
    plannedBranch: "agent/" + picked.identifier,
    bounceLimit: CONFIG.bounceLimit
  };
}

// 3. Set In Progress
phase("Make");
await setLinearState({
  issue: picked,
  state: "In Progress",
  label: null,
  note: "Orchestrator: starting work (single-task run)."
});

// 4. Maker (first attempt)
let maker = await agent(makerPrompt(picked, null), {
  label: "maker:" + picked.identifier,
  phase: "Make",
  agentType: "maker",
  isolation: "worktree",
  schema: MAKER_SCHEMA
});

if (!maker) {
  await setLinearState({
    issue: picked,
    label: CONFIG.labels.needsHuman,
    note: "Maker agent died / timed out before returning a result."
  });
  return { status: "BLOCKED", reason: "maker-died", picked: picked.identifier };
}

if (maker.status === "NOT_DEVELOPABLE" || maker.status === "BLOCKED") {
  const reason = maker.reason || maker.assumptions || "see handoff / maker result";
  await setLinearState({
    issue: picked,
    label: CONFIG.labels.needsHuman,
    note: `Maker ${maker.status}: ${reason}`
  });
  return {
    status: "BLOCKED",
    reason: maker.status,
    detail: reason,
    picked: picked.identifier
  };
}

const branch = maker.branch || "agent/" + picked.identifier;

// 5 + 6 + 7. Review / bounce / integrate loop (bounce cap per spec §4)
let bounces = 0;
let outcome = null;

while (true) {
  // Review
  phase("Review");
  await setLinearState({
    issue: picked,
    label: CONFIG.labels.inReview,
    note: "Orchestrator: dispatching independent reviewer."
  });

  const review = await agent(reviewerPrompt(picked, branch), {
    label: "reviewer:" + picked.identifier,
    phase: "Review",
    agentType: "reviewer",
    schema: REVIEW_SCHEMA
  });

  const passed = review && review.verdict === "PASS";

  if (passed) {
    // Integrate (serialized)
    phase("Integrate");
    const integ = await agent(integratorPrompt(picked, branch, maker), {
      label: "integrator:" + picked.identifier,
      phase: "Integrate",
      schema: INTEG_SCHEMA
    });

    if (integ && integ.result === "MERGED") {
      // The integrator itself set Done + posted the evidence comment (it holds the Linear MCP).
      log(`integrated ${picked.identifier} -> main (${integ.sha || "merge commit"}); issue Done.`);
      outcome = {
        status: "DONE",
        picked: picked.identifier,
        sha: integ.sha || null,
        bounces
      };
      break;
    }

    // Integration failed (conflict or red gate) -> counts toward the bounce limit
    bounces += 1;
    const why = integ ? integ.result + (integ.note ? ": " + integ.note : "") : "integrator agent died";
    if (bounces > CONFIG.bounceLimit) {
      await setLinearState({
        issue: picked,
        label: CONFIG.labels.needsHuman,
        note: `Integration still failing after ${CONFIG.bounceLimit} bounces (${why}). Escalating.`
      });
      outcome = { status: "BLOCKED", reason: "integration-bounce-limit", detail: why, picked: picked.identifier, bounces };
      break;
    }
    await setLinearState({
      issue: picked,
      label: CONFIG.labels.changesRequested,
      note: `Integration ${why} — resuming maker (bounce ${bounces}/${CONFIG.bounceLimit}).`
    });
    maker = await agent(
      makerPrompt(picked, "Resolve this integration failure so the branch merges cleanly and the gate is green on main:\n" + why),
      {
        label: "maker:" + picked.identifier + ":fix" + bounces,
        phase: "Make",
        agentType: "maker",
        isolation: "worktree",
        schema: MAKER_SCHEMA
      }
    );
    if (!maker || maker.status !== "DONE") {
      await setLinearState({
        issue: picked,
        label: CONFIG.labels.needsHuman,
        note: "Maker could not resolve the integration failure. Escalating."
      });
      outcome = { status: "BLOCKED", reason: "maker-failed-on-integration-fix", picked: picked.identifier, bounces };
      break;
    }
    continue; // re-review the fixed branch
  }

  // CHANGES-REQUESTED (or reviewer died) -> bounce
  bounces += 1;
  const findings = summarizeFindings(review);
  if (bounces > CONFIG.bounceLimit) {
    await setLinearState({
      issue: picked,
      label: CONFIG.labels.needsHuman,
      note: `Bounce limit (${CONFIG.bounceLimit}) exceeded. Findings:\n${findings}`
    });
    outcome = { status: "BLOCKED", reason: "review-bounce-limit", findings, picked: picked.identifier, bounces };
    break;
  }
  await setLinearState({
    issue: picked,
    label: CONFIG.labels.changesRequested,
    note: `Review round ${bounces}: CHANGES-REQUESTED — resuming the same maker.`
  });
  maker = await agent(makerPrompt(picked, "Reviewer findings to fix:\n" + findings), {
    label: "maker:" + picked.identifier + ":fix" + bounces,
    phase: "Make",
    agentType: "maker",
    isolation: "worktree",
    schema: MAKER_SCHEMA
  });
  if (!maker || maker.status !== "DONE") {
    await setLinearState({
      issue: picked,
      label: CONFIG.labels.needsHuman,
      note: "Maker could not complete the requested changes. Escalating."
    });
    outcome = { status: "BLOCKED", reason: "maker-failed-on-changes", picked: picked.identifier, bounces };
    break;
  }
  // loop -> re-review
}

log("orchestrator finished: " + outcome.status + " for " + picked.identifier);
return outcome;
