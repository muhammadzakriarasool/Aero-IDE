import type { NextConfig } from "next";

/**
 * WebContainer Cross-Origin Isolation Headers
 * ─────────────────────────────────────────────────────────────────────────────
 * WebContainers require `SharedArrayBuffer`, which is only available in
 * cross-origin isolated contexts. The browser enforces this via two headers
 * that MUST be present on every response:
 *
 *   - Cross-Origin-Embedder-Policy: require-corp
 *       Forces every sub-resource (scripts, workers, iframes) to opt-in to
 *       being loaded cross-origin, creating the isolated context.
 *
 *   - Cross-Origin-Opener-Policy: same-origin
 *       Severs the browsing context group from other origins, preventing
 *       cross-origin window access and enabling the isolation guarantee.
 *
 * WHY next.config.ts and NOT proxy.ts:
 *   Per the Next.js 16 execution order, `headers` from next.config fires
 *   FIRST — before proxy, before the filesystem, before any render.
 *   For static, unconditional headers this is the most lightweight path:
 *   zero runtime overhead, no Edge function invocation, no per-request cost.
 *   `proxy.ts` (formerly middleware) is reserved for dynamic request logic.
 *
 * ⚠️  WEBCONTAINER VITE RULE (Skills.md):
 *   The code generated *inside* the WebContainer MUST use Vite + React.
 *   Never scaffold a Next.js project inside the WebContainer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The two headers required for cross-origin isolation (SharedArrayBuffer). */
const CROSS_ORIGIN_ISOLATION_HEADERS = [
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  /**
   * Apply cross-origin isolation headers to ALL routes.
   * The `/:path*` wildcard covers every path including `/`.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: CROSS_ORIGIN_ISOLATION_HEADERS,
      },
    ];
  },
};

export default nextConfig;
