/**
 * @file src/lib/constants.ts
 * @description Application-wide constants for Aero IDE.
 */

/** Default Vite + React template files to scaffold inside the WebContainer.
 *  Per Skills.md: WebContainer code MUST be Vite + React — never Next.js.
 */
export const WEBCONTAINER_VITE_TEMPLATE = {
  "package.json": {
    file: {
      contents: JSON.stringify(
        {
          name: "aero-sandbox",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "tsc && vite build",
            preview: "vite preview",
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
            noFallthroughCasesInSwitch: true,
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
          contents: `export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Hello from Aero Sandbox 🚀</h1>
      <p>Edit <code>src/App.tsx</code> to get started.</p>
    </div>
  )
}
`,
        },
      },
    },
  },
} as const;

/** Supported file extensions for syntax highlighting */
export const SUPPORTED_EXTENSIONS = [
  "ts", "tsx", "js", "jsx", "css", "html", "json", "md", "sh",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];
