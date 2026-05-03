/**
 * @file src/types/index.ts
 * @description Global TypeScript type definitions for Aero IDE.
 *
 * ─── Source of Truth ─────────────────────────────────────────────────────────
 * Types related to the store (FileSystemTree, WebContainerStatus, etc.) are
 * defined in `@/lib/store.ts` and re-exported from here so the rest of the
 * codebase has a single consistent import surface:
 *
 *   import type { WebContainerStatus } from '@/types'
 *
 * Feature-specific types live in their respective feature folder.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Re-exports from the store ────────────────────────────────────────────────
export type {
  FileNode,
  DirectoryNode,
  FileSystemTree,
  WebContainerStatus,
  IDEState,
  IDEActions,
  IDEStore,
} from "@/lib/store";

// ─── Panel Layout ─────────────────────────────────────────────────────────────

/** The distinct panel regions of the IDE shell */
export type PanelId = "sidebar" | "editor" | "preview" | "terminal";

export interface PanelState {
  id: PanelId;
  isVisible: boolean;
  /** Width/height as a percentage of the total layout (0–100). */
  size: number;
}

// ─── File Explorer ────────────────────────────────────────────────────────────
// Note: the *store* FileSystemTree uses the @webcontainer/api shape (recursive
// `{ file: ... } | { directory: ... }` nodes). The types below are for the
// *rendered* file-explorer UI tree — a flattened, display-oriented structure.

export type FileNodeType = "file" | "directory";

/** A single node in the rendered file-explorer sidebar tree. */
export interface ExplorerNode {
  name: string;
  type: FileNodeType;
  /** Absolute path inside the WebContainer FS (e.g. "/src/App.tsx"). */
  path: string;
  children?: ExplorerNode[];
}

// ─── Editor ───────────────────────────────────────────────────────────────────

export interface EditorTab {
  id: string;
  filePath: string;
  isDirty: boolean;
}

export type EditorTheme = "dark" | "light";
