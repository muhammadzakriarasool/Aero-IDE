/**
 * @file src/lib/store.ts
 * @description Global IDE state manager — Zustand v5, React 19 / Next.js 16 App Router.
 *
 * ─── Hydration Safety ────────────────────────────────────────────────────────
 * React 19's concurrent renderer can read state multiple times during a single
 * render pass. Without care this causes "tearing" — different components seeing
 * different snapshots of the same store update.
 *
 * Mitigations applied here:
 *  1. `unstable_ssrSafe` middleware: suppresses store initialisation on the
 *     server so the SSR HTML and client initial state are always identical.
 *     Zero mismatch → zero hydration warning.
 *  2. `subscribeWithSelector` middleware: lets consumers subscribe to a slice of
 *     state (e.g. only `webContainerStatus`) rather than the whole tree, so
 *     React can bail out of re-renders more aggressively.
 *  3. Atomic setter actions: every mutation updates a single, well-scoped slice.
 *     No compound-state mutations that could leave the store in a partial state
 *     across a render boundary.
 *
 * ─── No Persistence ──────────────────────────────────────────────────────────
 * Per MVP requirements, state is NOT persisted to localStorage. The store
 * resets to `INITIAL_IDE_STATE` on every page load. Persistence can be
 * added in Phase 2 via Zustand's `persist` middleware.
 *
 * ─── WebContainer / Vite Rule (Skills.md) ────────────────────────────────────
 * The `files` field holds a `FileSystemTree` designed to represent a Vite +
 * React project. Never store a Next.js project structure here.
 * See `src/lib/constants.ts` for the canonical starter template.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { unstable_ssrSafe as ssrSafe } from "zustand/middleware";

// ─── FileSystemTree Types ─────────────────────────────────────────────────────
// Shaped to be a drop-in match for @webcontainer/api's FileSystemTree,
// so migrating in Phase 2 requires zero changes to this definition.

/**
 * A single file node within the virtual file system.
 * `contents` may be a UTF-8 string (source code) or binary Uint8Array.
 */
export interface FileNode {
  file: {
    contents: string | Uint8Array;
    /**
     * Optional encoding hint for binary content.
     * Matches the @webcontainer/api `encoding` field.
     */
    encoding?: "utf-8" | "binary";
  };
}

/**
 * A directory node. Its value is a nested `FileSystemTree`,
 * forming a recursive tree structure.
 */
export interface DirectoryNode {
  directory: FileSystemTree;
}

/**
 * A virtual file system tree.
 * Each key is a file or directory name (not a full path).
 * Maps directly to @webcontainer/api's `FileSystemTree` type.
 *
 * ⚠️  SKILLS.MD RULE: The tree stored here MUST represent a Vite + React
 * project. Never populate this with a Next.js project structure.
 *
 * @example
 * const tree: FileSystemTree = {
 *   'package.json': { file: { contents: '{"name":"my-app"}' } },
 *   src: {
 *     directory: {
 *       'main.tsx': { file: { contents: '...' } },
 *       'App.tsx':  { file: { contents: '...' } },
 *     },
 *   },
 * };
 */
export type FileSystemTree = {
  [name: string]: FileNode | DirectoryNode;
};

// ─── WebContainer Status ──────────────────────────────────────────────────────

/**
 * Lifecycle phases of the WebContainer instance.
 *
 *  idle        → not yet started (default)
 *  booting     → @webcontainer/api.boot() in progress
 *  installing  → running `npm install` inside the container
 *  running     → dev server is alive, preview URL available
 *  ready       → container fully operational (alias for running, used after setup)
 *  error       → an unrecoverable error occurred; see `webContainerError`
 */
export type WebContainerStatus =
  | "idle"
  | "booting"
  | "installing"
  | "running"
  | "ready"
  | "error";

// ─── IDE State & Actions ──────────────────────────────────────────────────────

/**
 * The pure data slice of the IDE store.
 * No actions — only serialisable state.
 */
export interface IDEState {
  /** The current user prompt string (the AI generation input). */
  prompt: string;

  /** True while an AI generation request is in flight. */
  isGenerating: boolean;

  /** True while an npm install process is in flight to prevent overlapping installs. */
  isInstalling: boolean;

  /**
   * Lifecycle phase of the WebContainer instance.
   * Transitions: idle → booting → installing → running → ready
   *                                                    ↘ error (from any phase)
   */
  webContainerStatus: WebContainerStatus;

  /**
   * Human-readable error message when `webContainerStatus === "error"`.
   * Null in all other states.
   */
  webContainerError: string | null;

  /**
   * The virtual Vite + React file system tree to be mounted into the
   * WebContainer. Empty object until the first successful generation.
   *
   * @see FileSystemTree
   */
  files: FileSystemTree;

  /** True if Monaco should save to WebContainer after 1000ms debounce. */
  autoSave: boolean;
}

/**
 * Mutating actions exposed by the store.
 * Each action is deliberately atomic — one action, one concern.
 */
export interface IDEActions {
  /** Update the prompt text (controlled by the UI input). */
  setPrompt: (prompt: string) => void;

  /** Toggle the AI generation loading state. */
  setIsGenerating: (isGenerating: boolean) => void;

  /** Toggle the npm install loading state. */
  setIsInstalling: (isInstalling: boolean) => void;

  /**
   * Transition the WebContainer to a new status.
   * Automatically clears `webContainerError` unless transitioning to "error".
   */
  setWebContainerStatus: (status: WebContainerStatus, error?: string) => void;

  /**
   * Replace the entire file tree with a new Vite + React project structure.
   * Shallow-replaces the `files` object — does not deep-merge.
   */
  setFiles: (files: FileSystemTree) => void;

  /**
   * Patch a single file inside the existing tree without replacing
   * the entire structure. Useful for incremental AI edits.
   */
  patchFile: (path: string, node: FileNode | DirectoryNode) => void;

  /**
   * Reset the store to its initial state.
   * Called when the user starts a new session.
   */
  reset: () => void;

  /** Toggle the auto-save setting. */
  setAutoSave: (autoSave: boolean) => void;
}

/** The full Zustand store type — state + actions. */
export type IDEStore = IDEState & IDEActions;

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_IDE_STATE: IDEState = {
  prompt: "",
  isGenerating: false,
  isInstalling: false,
  webContainerStatus: "idle",
  webContainerError: null,
  files: {},
  autoSave: true, // Defaulting to true as it is better UX for an IDE
};

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * The global IDE Zustand store.
 *
 * Usage in Client Components:
 * ```tsx
 * 'use client'
 * import { useIDEStore } from '@/lib/store'
 *
 * // Atomic slice — only re-renders when `isGenerating` changes:
 * const isGenerating = useIDEStore((s) => s.isGenerating)
 *
 * // Action — stable reference, never causes a re-render:
 * const setFiles = useIDEStore((s) => s.setFiles)
 * ```
 *
 * Usage outside React (e.g. a service module):
 * ```ts
 * import { useIDEStore } from '@/lib/store'
 * useIDEStore.getState().setWebContainerStatus('booting')
 * ```
 */
export const useIDEStore = create<IDEStore>()(
  ssrSafe(
    subscribeWithSelector((set, get) => ({
      // ── Initial State ────────────────────────────────────────────────────
      ...INITIAL_IDE_STATE,

      // ── Actions ──────────────────────────────────────────────────────────

      setPrompt: (prompt) => set({ prompt }),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      setIsInstalling: (isInstalling) => set({ isInstalling }),

      setWebContainerStatus: (status, error) =>
        set({
          webContainerStatus: status,
          webContainerError: status === "error" ? (error ?? "Unknown error") : null,
        }),

      setFiles: (files) => set({ files }),

      patchFile: (path, node) => {
        const currentFiles = get().files;
        // Top-level patch only (Phase 1 MVP).
        // Phase 2 can add recursive path resolution if needed.
        set({ files: { ...currentFiles, [path]: node } });
      },

      setAutoSave: (autoSave) => set({ autoSave }),

      reset: () => set({ ...INITIAL_IDE_STATE }),
    }))
  )
);

// ─── Typed Selector Helpers ───────────────────────────────────────────────────
// Pre-built selectors avoid inline arrow functions, which would create new
// references on every render and defeat Zustand's memoisation.

/** Select the current prompt string. */
export const selectPrompt = (s: IDEStore): string => s.prompt;

/** Select the AI generation loading flag. */
export const selectIsGenerating = (s: IDEStore): boolean => s.isGenerating;

/** Select the npm install loading flag. */
export const selectIsInstalling = (s: IDEStore): boolean => s.isInstalling;

/** Select the WebContainer lifecycle status. */
export const selectWebContainerStatus = (s: IDEStore): WebContainerStatus =>
  s.webContainerStatus;

/** Select the WebContainer error string (null unless status === "error"). */
export const selectWebContainerError = (s: IDEStore): string | null =>
  s.webContainerError;

/** Select the virtual file system tree. */
export const selectFiles = (s: IDEStore): FileSystemTree => s.files;

/** Select the `setFiles` action (stable reference). */
export const selectSetFiles = (s: IDEStore): IDEActions["setFiles"] =>
  s.setFiles;

/** Select the `setWebContainerStatus` action (stable reference). */
export const selectSetWebContainerStatus = (
  s: IDEStore
): IDEActions["setWebContainerStatus"] => s.setWebContainerStatus;

export const selectAutoSave = (s: IDEStore): boolean => s.autoSave;
export const selectSetAutoSave = (s: IDEStore): IDEActions["setAutoSave"] => s.setAutoSave;
