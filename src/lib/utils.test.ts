import { describe, expect, it } from "vitest";

import { cn } from "./utils";

// Smoke test: proves `npm run test` is wired. Write real tests next to the
// code they cover, as `*.test.ts`.
describe("cn", () => {
  it("merges class names and drops falsy values", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
