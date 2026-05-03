/**
 * @file src/features/editor/types.ts
 * @description Editor-specific type definitions.
 */

import type { EditorTab, EditorTheme } from "@/types";

export interface EditorStore {
  tabs: EditorTab[];
  activeTabId: string | null;
  theme: EditorTheme;
  fontSize: number;
  wordWrap: boolean;

  // Actions
  openTab: (filePath: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  markDirty: (tabId: string, isDirty: boolean) => void;
}

export interface EditorSettings {
  theme: EditorTheme;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  theme: "dark",
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  lineNumbers: true,
};
