/**
 * @file src/features/webcontainer/boot.ts
 * @description WebContainer boot sequence — pure TypeScript, no React.
 *
 * ⚠️  SKILLS.MD RULE: The FileSystemTree mounted here is a Vite + React project.
 *     Never mount a Next.js project structure inside the WebContainer.
 *
 * This module is the single authoritative source for:
 *  1. The baseline Vite + React FileSystemTree
 *  2. The boot → mount → install → dev-server sequence
 *  3. Streaming terminal output back to the caller via a callback
 */

import type { WebContainer, FileSystemTree } from "@webcontainer/api";

// ─── Baseline Vite + React FileSystemTree ─────────────────────────────────────
// Typed against @webcontainer/api's FileSystemTree directly so any future
// API changes surface as a compile-time error rather than a runtime failure.

/**
 * A minimal but fully-functional Vite + React TypeScript project.
 * Proof-of-concept for the WebContainer boot sequence.
 *
 * ⚠️  Vite scaffolding rule: this MUST stay as Vite + React, never Next.js.
 */
export const VITE_REACT_BASELINE: FileSystemTree = {
  "package.json": {
    file: {
      contents: JSON.stringify(
        {
          name: "aero-sandbox",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: {
            dev: "vite --host",
            build: "tsc && vite build",
            preview: "vite preview --host",
          },
          dependencies: {
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
          devDependencies: {
            "@types/react": "^19.0.0",
            "@types/react-dom": "^19.0.0",
            "@vitejs/plugin-react": "^4.3.4",
            typescript: "~5.7.2",
            vite: "^6.0.5",
          },
        },
        null,
        2
      ),
    },
  },

  "vite.config.ts": {
    file: {
      contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Required inside WebContainer: disable HMR WebSocket (not supported)
    hmr: false,
  },
})
`,
    },
  },

  "tsconfig.json": {
    file: {
      contents: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            useDefineForClassFields: true,
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            module: "ESNext",
            skipLibCheck: true,
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            isolatedModules: true,
            moduleDetection: "force",
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
          },
          include: ["src"],
        },
        null,
        2
      ),
    },
  },

  "index.html": {
    file: {
      contents: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aero Sandbox</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; background: #0a0a14; color: #ededed; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
  },

  src: {
    directory: {
      "main.tsx": {
        file: {
          contents: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
        },
      },
      "App.tsx": {
        file: {
          contents: `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1.5rem',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: '3rem' }}>⚡</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
        Aero Sandbox
      </h1>
      <p style={{ color: '#888', fontSize: '0.9rem' }}>
        Vite + React — running inside a WebContainer
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          padding: '0.5rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '0.5rem',
          border: '1px solid #6366f1',
          background: 'transparent',
          color: '#6366f1',
          cursor: 'pointer',
        }}
      >
        Count: {count}
      </button>
    </div>
  )
}
`,
        },
      },
    },
  },
};

// ─── Boot Sequence Types ───────────────────────────────────────────────────────

/** Callback invoked on each chunk of terminal output from the container. */
export type TerminalOutputCallback = (chunk: string) => void;

/** Result of a successful boot sequence. */
export interface BootResult {
  /** The live WebContainer instance (keep a ref to call teardown() later). */
  instance: WebContainer;
  /** The URL of the running Vite dev server preview. */
  previewUrl: string;
}

// ─── Boot Sequence ────────────────────────────────────────────────────────────

/**
 * Runs the full WebContainer boot sequence:
 *  1. Boot the container
 *  2. Mount the Vite + React baseline FileSystemTree
 *  3. Run `npm install`
 *  4. Start `vite --host` dev server
 *  5. Resolve when `server-ready` fires
 *
 * Terminal output is streamed back chunk-by-chunk via `onOutput`.
 * Any step failure rejects the returned Promise with a descriptive error.
 *
 * @param onOutput  - Called for each stdout/stderr chunk.
 * @param onStatus  - Called with a human-readable status update on each phase.
 * @param tree      - Optional override; defaults to VITE_REACT_BASELINE.
 */
export async function bootWebContainer(
  onOutput: TerminalOutputCallback,
  onStatus: (status: string) => void,
  tree: FileSystemTree = VITE_REACT_BASELINE
): Promise<BootResult> {
  // Dynamically import so this module is never evaluated on the server.
  // The 'use client' boundary in AeroWorkspace prevents SSR, but being
  // explicit here is a belt-and-suspenders guard.
  const { WebContainer } = await import("@webcontainer/api");

  // ── Phase 1: Boot ──────────────────────────────────────────────────────────
  onStatus("Booting WebContainer…");
  const instance = await WebContainer.boot({ coep: "require-corp" });

  // ── Phase 2: Mount ─────────────────────────────────────────────────────────
  onStatus("Mounting Vite + React project…");
  await instance.mount(tree);

  // ── Phase 3: Install ───────────────────────────────────────────────────────
  onStatus("Running npm install…");
  const installProcess = await instance.spawn("npm", ["install", "--no-progress", "--no-color"]);

  // Stream install output to the terminal pane
  void installProcess.output
    .pipeTo(
      new WritableStream<string>({
        write(chunk) {
          onOutput(chunk);
        },
      })
    )
    .catch(() => {
      // Stream abort on teardown is expected — silently ignore
    });

  const installExitCode = await installProcess.exit;
  if (installExitCode !== 0) {
    throw new Error(`npm install failed with exit code ${installExitCode}`);
  }

  // ── Phase 4: Dev server ────────────────────────────────────────────────────
  onStatus("Starting Vite dev server…");
  const devProcess = await instance.spawn("npm", ["run", "dev"]);

  // Stream dev server output
  void devProcess.output
    .pipeTo(
      new WritableStream<string>({
        write(chunk) {
          onOutput(chunk);
        },
      })
    )
    .catch(() => {
      // Stream abort on teardown is expected — silently ignore
    });

  // ── Phase 5: Await preview URL ─────────────────────────────────────────────
  onStatus("Waiting for server-ready…");
  const previewUrl = await new Promise<string>((resolve, reject) => {
    const unsub = instance.on("server-ready", (_port, url) => {
      unsub();
      resolve(url);
    });

    // Reject if the container errors before the server is ready
    const unsubErr = instance.on("error", ({ message }) => {
      unsubErr();
      reject(new Error(`WebContainer error: ${message}`));
    });
  });

  onStatus("Ready");
  return { instance, previewUrl };
}
