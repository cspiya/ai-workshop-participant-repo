# Design guideline

The house style rulebook — the agent follows it in every UI task.
You fill it in during the workshop (v0 / shadcn will help); an empty section
is still a section: it tells the agent that the decision is still open.

> You may write your VALUES in Hungarian if that feels more comfortable —
> English is recommended, as models follow English instructions best.

## Brand & tone

<!-- What is the site's mood? (e.g. playful / professional / minimalist) -->

## Colors

<!-- Primary / secondary colors. Use Tailwind tokens, e.g. `bg-emerald-600`. -->

## Typography

<!-- Font families and the size scale. Default: Geist (already wired up in the layout). -->

## Layout & spacing

<!-- Max width, spacing rhythm, mobile-first rules. -->

## Components

<!-- Which shadcn component is used for what; rules for custom variants. -->

## Don'ts

<!-- What the agent must NEVER do in the UI (e.g. inline styles, new UI libraries). -->

---

## Agent-driven design chain (2026-07 state)

You don't design by hand and you don't prompt blindly: the agent drives a design
tool FOR you, from the spec you approved. Two proven paths — both end back in
this file, because **this guideline is the contract: agents follow it, humans
approve it.**

**Prerequisites** (once, before the design step):
- Claude in Chrome/Edge browser extension installed and signed in →
  official guide: <https://claude.ai/chrome>
- OR for the Codex path: the Codex IDE/browser integration →
  official guide: <https://developers.openai.com/codex>
- An APPROVED spec package (constitution/spec/given-when-then/plan/tasks —
  module 3 output). Design starts from the spec, never from vibes.

### Path A — Claude Code drives Claude Design

1. In your Claude Code session run `/design consent` — this lets the agent
   read/write your Claude Design projects.
2. Fill (or let the agent draft) the token sections above — the agent can
   extract them from an existing brand site if you have one.
3. Give the agent this prompt (adjust the bracketed parts):

   > Using the approved spec package in `docs/spec/` and the tokens in
   > `DESIGN-GUIDELINE.md`: (1) sync the tokens and one reference page as a
   > design-system project via Claude Design; (2) open claude.ai/design in my
   > browser, complete the design-system setup wizard with our brand blurb and
   > exact tokens, and run the generation; (3) when it finishes, review the
   > result against the guideline and list deviations. Do not invent colors or
   > fonts — everything comes from the guideline.

4. Review the generated system at claude.ai/design (your eyes are the gate).
5. Import: the agent copies accepted components into `src/components/` and
   writes every new token decision BACK into this file — one source of truth.

### Path B — v0 + shadcn (from Codex or Claude)

1. Prompt v0 (v0.dev) with the spec's screen list plus the tokens above:

   > Build the [screen name] screen for the app specified as: [2-3 sentence
   > summary from spec.md]. Use exactly these design tokens: [paste Colors +
   > Typography sections]. shadcn/ui components only, mobile-first, no new
   > libraries.

2. Iterate in v0 until the screen matches the guideline, then pull the result
   into the starter: `npx shadcn@latest add "<v0 component URL>"`.
3. Record any token or component decision v0 introduced back into this file,
   and have the agent run the usual gates (`npm run typecheck && npm run lint
   && npm run test`) before committing.

Whichever path you take: the spec says WHAT, this guideline says HOW IT LOOKS,
and the agent connects the two — with you approving at both gates.
