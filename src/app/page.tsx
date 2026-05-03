/**
 * @file src/app/page.tsx
 * @description Aero IDE root page — thin RSC shell that renders the workspace.
 *
 * This component stays a React Server Component intentionally.
 * All client-side logic (Monaco, WebContainer) lives inside <AeroWorkspace />,
 * which declares its own "use client" boundary.
 */

import AeroWorkspace from "@/features/editor/AeroWorkspace";

export default function AeroIDEPage() {
  return <AeroWorkspace />;
}
