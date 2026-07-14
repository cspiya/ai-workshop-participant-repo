import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Types are checked exactly once, by the explicit `npm run typecheck`
    // step (first step of the local validation loop, dedicated step in CI —
    // see .github/workflows/ci.yml). Skipping the duplicate check inside
    // `next build` keeps builds fast and failure sources unambiguous.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
