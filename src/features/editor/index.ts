/**
 * @file src/features/editor/index.ts
 * @description Public barrel for the Editor feature.
 *
 * The Editor feature is responsible for:
 * - Rendering and managing code editor panes (Monaco / CodeMirror in Phase 2)
 * - Managing open tabs and active file state
 * - Providing keyboard shortcuts for editor actions
 *
 * Internal modules: components/, hooks/, store/, types.ts
 */

// Public API
export { default as AeroWorkspace } from "./AeroWorkspace";
