/**
 * @file src/features/webcontainer/types.ts
 * @description WebContainer feature-specific type definitions.
 */

import type { FileNode, WebContainerStatus } from "@/types";

export interface WebContainerStore {
  status: WebContainerStatus;
  previewUrl: string | null;
  fileTree: FileNode[];
  terminalOutput: string[];

  // Actions
  boot: () => Promise<void>;
  mountFiles: (files: Record<string, unknown>) => Promise<void>;
  runCommand: (command: string, args: string[]) => Promise<void>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
}

/**
 * Represents a running process inside the WebContainer.
 * Maps to the ProcessOptions from @webcontainer/api.
 */
export interface ContainerProcess {
  pid: number;
  command: string;
  args: string[];
  exitCode: number | null;
}

/** Terminal line entry with metadata for rendering */
export interface TerminalLine {
  id: string;
  content: string;
  type: "stdout" | "stderr" | "info" | "success" | "error";
  timestamp: number;
}
