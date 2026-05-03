/**
 * @file src/features/webcontainer/index.ts
 * @description Public barrel for the WebContainer feature.
 *
 * The WebContainer feature is responsible for:
 * - Booting and managing the @webcontainer/api instance (Phase 2)
 * - Mounting virtual file system trees
 * - Spawning dev server processes (npm run dev)
 * - Streaming terminal output
 * - Surfacing the preview iframe URL
 *
 * ⚠️  SKILLS.MD RULE: All code *generated for* the WebContainer must be
 *     scaffolded as Vite + React. Never scaffold Next.js inside the container.
 *
 * Internal modules: components/, hooks/, store/, service.ts, types.ts
 */

// Re-export public API as the feature grows.
// e.g. export { useWebContainer } from './hooks/useWebContainer';
