"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as MonacoTypes from "monaco-editor";
import dynamic from "next/dynamic";
import type { WebContainer } from "@webcontainer/api";
import { reloadPreview } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  useIDEStore,
  selectPrompt,
  selectIsGenerating,
  selectIsInstalling,
  selectWebContainerStatus,
  selectWebContainerError,
  selectFiles,
  selectSetWebContainerStatus,
  selectAutoSave,
  selectSetAutoSave,
} from "@/lib/store";
import type { FileSystemTree } from "@/lib/store";
import { bootWebContainer, VITE_REACT_BASELINE } from "@/features/webcontainer/boot";
import { getLanguageFromExtension, getFileExtension, getFileIcon } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Play,
  Copy,
  RefreshCw,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Terminal as TerminalIcon,
  Check,
} from "lucide-react";
import { usePanelRef } from "react-resizable-panels";

// ─── Dynamic Monaco Import ─────────────────────────────────────────────────────
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[oklch(0.12_0.01_265)]">
        <span className="animate-pulse text-sm text-muted-foreground font-mono">
          Loading editor…
        </span>
      </div>
    ),
  }
);

// ─── Terminal Output State ─────────────────────────────────────────────────────

const getFlatFiles = (tree: FileSystemTree, path = ""): string[] => {
  let list: string[] = [];
  for (const [key, node] of Object.entries(tree)) {
    const currentPath = path ? `${path}/${key}` : key;
    if ("file" in node) {
      list.push(currentPath);
    } else if ("directory" in node) {
      list.push(...getFlatFiles(node.directory, currentPath));
    }
  }
  return list;
};

function getFileContentFromTree(tree: any, filePath: string): string {
  const parts = filePath.split("/");
  let current: any = tree;
  for (let i = 0; i < parts.length; i++) {
     const part = parts[i];
     if (!part) continue;
     if (i === parts.length - 1) {
       if (current[part] && "file" in current[part]) {
         return typeof current[part].file.contents === "string" 
           ? current[part].file.contents 
           : "";
       }
     } else {
       if (current[part] && "directory" in current[part]) {
         current = current[part].directory;
       } else {
         break;
       }
     }
  }
  return "";
}

function updateFileInTree(tree: any, filePath: string, content: string) {
  const newTree = JSON.parse(JSON.stringify(tree));
  const parts = filePath.split("/");
  let current: any = newTree;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i === parts.length - 1) {
      if (!current[part]) {
         current[part] = { file: { contents: content } };
      } else {
         current[part].file.contents = content;
      }
    } else {
      if (!current[part]) {
        current[part] = { directory: {} };
      }
      current = current[part].directory;
    }
  }
  return newTree;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AeroWorkspace() {
  const prompt = useIDEStore(selectPrompt);
  const isGenerating = useIDEStore(selectIsGenerating);
  const isInstalling = useIDEStore(selectIsInstalling);
  const wcStatus = useIDEStore(selectWebContainerStatus);
  const wcError = useIDEStore(selectWebContainerError);
  const files = useIDEStore(selectFiles);
  const autoSave = useIDEStore(selectAutoSave);
  const setWcStatus = useIDEStore(selectSetWebContainerStatus);
  const setPrompt = useIDEStore((s) => s.setPrompt);
  const setIsGenerating = useIDEStore((s) => s.setIsGenerating);
  const setIsInstalling = useIDEStore((s) => s.setIsInstalling);
  const setFiles = useIDEStore((s) => s.setFiles);
  const setAutoSave = useIDEStore(selectSetAutoSave);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string>("src/App.tsx");
  const [draftContent, setDraftContent] = useState<string>("");
  
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const containerRef = useRef<WebContainer | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasBooted = useRef(false);
  // Stable ref so Monaco's onMount closure always calls the latest save fn
  const handleManualSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();

  const writeToTerminal = useCallback((text: string, type: 'system' | 'prompt' | 'error' | 'success' | 'separator') => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;
    switch (type) {
      case 'system':
        term.write(`\x1b[33m${text}\x1b[0m\r\n`);
        break;
      case 'prompt':
        term.write(`\x1b[36m${text}\x1b[0m\r\n`);
        break;
      case 'error':
        term.write(`\x1b[31m${text}\x1b[0m\r\n`);
        break;
      case 'success':
        term.write(`\x1b[32m${text}\x1b[0m\r\n`);
        break;
      case 'separator':
        term.write(`\x1b[90m\r\n------------------------------------------------------\r\n\x1b[0m`);
        break;
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new Terminal({
      theme: { background: "#18181b" },
      fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
      fontSize: 12,
      convertEol: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasBooted.current) return;
    hasBooted.current = true;

    const run = async () => {
      setWcStatus("booting");
      try {
        const { instance, previewUrl: url } = await bootWebContainer(
          (chunk) => {
            if (xtermRef.current) xtermRef.current.write(chunk);
          },
          (status) => {
            writeToTerminal(`[aero] ${status}`, 'system');
            if (status.includes("npm install")) setWcStatus("installing");
            else if (status.includes("Vite dev")) setWcStatus("running");
          },
          Object.keys(files).length > 0 ? files : VITE_REACT_BASELINE
        );

        containerRef.current = instance;
        setPreviewUrl(url);
        setWcStatus("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown boot error";
        setWcStatus("error", message);
        writeToTerminal(`[aero:error] ${message}`, 'error');
      }
    };

    void run();

    return () => {
      containerRef.current?.teardown();
      containerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tree = Object.keys(files).length > 0 ? files : VITE_REACT_BASELINE;
  const flatFiles = getFlatFiles(tree as any);

  // Initialize draft content when active file changes
  useEffect(() => {
    setDraftContent(getFileContentFromTree(tree, activeFile));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]); // Removed 'files' to prevent typing overwrite

  const checkAndRunInstall = async (oldTree: any, newTree: any): Promise<boolean> => {
    const oldPkg = getFileContentFromTree(oldTree, "package.json");
    const newPkg = getFileContentFromTree(newTree, "package.json");
    
    if (oldPkg === newPkg) return false;

    setIsInstalling(true);
    writeToTerminal("[aero] package.json changes detected. Running npm install...", 'system');
    try {
      const installProcess = await containerRef.current!.spawn("npm", ["install", "--no-progress", "--no-color"]);
      
      installProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            if (xtermRef.current) xtermRef.current.write(chunk);
          }
        })
      );
      
      const exitCode = await installProcess.exit;
      if (exitCode === 0) {
        writeToTerminal("[aero] Install complete.", 'success');
        if (iframeRef.current) {
          await reloadPreview(iframeRef.current).catch(() => {
            if (iframeRef.current) iframeRef.current.src += '';
          });
        }
        return true;
      } else {
        writeToTerminal("[aero:error] npm install failed. Please check your package.json.", 'error');
        setWcStatus("error", "npm install failed");
      }
    } catch (err: any) {
      writeToTerminal(`[aero:error] Install error: ${err.message}`, 'error');
    } finally {
      setIsInstalling(false);
    }
    return false;
  };

  const handleManualSave = useCallback(async () => {
    if (containerRef.current) {
      const currentTree = Object.keys(useIDEStore.getState().files).length > 0 
        ? useIDEStore.getState().files 
        : VITE_REACT_BASELINE;
      const newTree = updateFileInTree(currentTree, activeFile, draftContent);
      useIDEStore.getState().setFiles(newTree);

      const allFiles = getFlatFiles(newTree as any);
      for (const file of allFiles) {
        const content = getFileContentFromTree(newTree, file);
        const parts = file.split("/");
        parts.pop();
        let dir = "";
        for (const p of parts) {
          dir += (dir ? "/" : "") + p;
          try {
            await containerRef.current.fs.mkdir(dir);
          } catch (e: any) {
            // Ignore if exists
          }
        }
        await containerRef.current.fs.writeFile(file, content);
      }
      writeToTerminal(`[aero] Synced all files to WebContainer via Delta Update`, 'system');

      const didReload = await checkAndRunInstall(currentTree, newTree);
      if (!didReload && iframeRef.current) {
        await reloadPreview(iframeRef.current).catch(() => {
          if (iframeRef.current) iframeRef.current.src += '';
        });
      }
    }
  }, [activeFile, draftContent, writeToTerminal, setIsInstalling, setWcStatus]);

  // Keep the stable ref in sync with the latest closure
  useEffect(() => {
    handleManualSaveRef.current = handleManualSave;
  }, [handleManualSave]);

  // Debounced auto-save
  useEffect(() => {
    if (!autoSave || !containerRef.current || !hasBooted.current || isInstalling) return;
    const timeout = setTimeout(() => {
      // 1. Sync React State
      const currentTree = Object.keys(useIDEStore.getState().files).length > 0 
        ? useIDEStore.getState().files 
        : VITE_REACT_BASELINE;
      useIDEStore.getState().setFiles(updateFileInTree(currentTree, activeFile, draftContent));
      
      // 2. Write single file delta
      void containerRef.current!.fs.writeFile(activeFile, draftContent);
      writeToTerminal(`[aero] Auto-saved ${activeFile}`, 'system');
    }, 1000);
    return () => clearTimeout(timeout);
  }, [draftContent, autoSave, activeFile, writeToTerminal, isInstalling]);

  const editorLanguage = getLanguageFromExtension(getFileExtension(activeFile));

  const statusColor: Record<typeof wcStatus, string> = {
    idle: "bg-muted-foreground",
    booting: "bg-yellow-500 animate-pulse",
    installing: "bg-blue-500 animate-pulse",
    running: "bg-blue-400 animate-pulse",
    ready: "bg-emerald-500",
    error: "bg-destructive",
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <ResizablePanelGroup id="main-group" orientation="horizontal">
        
        {/* ── LEFT PANE — Chat / Prompt / Files ──────────────────────────────── */}
        <ResizablePanel 
          panelRef={leftPanelRef}
          id="left-panel"
          defaultSize={"20%"} 
          minSize={"15%"} 
          maxSize={"40%"}
          collapsible
          collapsedSize={"4%"}
          onResize={(size: any) => {
            const pct = typeof size === 'number' ? size : size.asPercentage;
            setLeftCollapsed(pct < 5);
          }}
          className="flex flex-col border-r border-border bg-sidebar transition-all duration-150 ease-in-out"
        >
          {leftCollapsed ? (
            <div className="flex h-full flex-col items-center justify-start py-4 overflow-hidden">
              <button
                onClick={() => leftPanelRef.current?.expand()}
                title="Expand sidebar"
                className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <PanelLeftOpen size={18} />
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3 shrink-0">
                <span className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  Aero <span className="text-primary">IDE</span>
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${statusColor[wcStatus]}`}
                    title={`WebContainer: ${wcStatus}${wcError ? ` — ${wcError}` : ""}`}
                  />
                  <button onClick={() => leftPanelRef.current?.collapse()} className="text-muted-foreground hover:text-foreground">
                    <PanelLeftClose size={18} />
                  </button>
                </div>
              </div>

              <ResizablePanelGroup id="left-inner-group" orientation="vertical">
                {/* ── Prompt Area ── */}
                <ResizablePanel id="prompt-panel" defaultSize={"55%"} minSize={"30%"} className="flex flex-col p-4 overflow-y-auto">
                  <label htmlFor="prompt-input" className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Prompt
                  </label>

                  <textarea
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating || isInstalling}
                    placeholder="Describe what you want to build…"
                    className="w-full flex-1 min-h-[90px] resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  />

                  <button
                    type="button"
                    disabled={isGenerating || isInstalling || prompt.trim().length === 0}
                    className="mt-3 w-full shrink-0 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={async () => {
                      writeToTerminal("", 'separator');
                      writeToTerminal(`[aero] Generating feature: "${prompt}"...`, 'prompt');
                      setIsGenerating(true);
                      try {
                        const res = await fetch('/api/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt }),
                        });
                        
                        const data = await res.json();
                        
                        if (!res.ok) {
                          throw new Error(data.error || 'Generation failed');
                        }
                        
                        const currentTree = Object.keys(useIDEStore.getState().files).length > 0 
                          ? useIDEStore.getState().files 
                          : VITE_REACT_BASELINE;
                        
                        setFiles(data.files);
                        
                        if (containerRef.current) {
                          await containerRef.current.mount(data.files);
                          writeToTerminal("[aero] WebContainer files updated. Changes should appear shortly.", 'success');
                          
                          const didReload = await checkAndRunInstall(currentTree, data.files);
                          if (!didReload && iframeRef.current) {
                            await reloadPreview(iframeRef.current).catch(() => {
                              if (iframeRef.current) iframeRef.current.src += '';
                            });
                          }

                          setPrompt("");
                          setDraftContent(getFileContentFromTree(data.files, activeFile));
                        }
                      } catch (err: any) {
                        writeToTerminal(`[aero:error] ${err.message}`, 'error');
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                  >
                    {isGenerating ? "Generating…" : "Generate ✦"}
                  </button>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* ── Settings Panel ── */}
                <ResizablePanel id="settings-panel" defaultSize={"15%"} minSize={"10%"} maxSize={"30%"} className="flex flex-col border-t border-sidebar-border">
                  <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-2 shrink-0">
                    <Settings2 size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {/* Auto-Save Toggle */}
                    <label className="flex items-center justify-between gap-2 cursor-pointer group">
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        Auto-Save <span className="text-muted-foreground/60">(1s debounce)</span>
                      </span>
                      {/* Stylized toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoSave}
                        onClick={() => setAutoSave(!autoSave)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          autoSave ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform ${
                            autoSave ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* File tree */}
                <ResizablePanel id="files-panel" defaultSize={"40%"} minSize={"20%"} className="flex flex-col p-3 border-t border-sidebar-border bg-sidebar">
                  <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Files
                  </p>
                  <div className="flex-1 overflow-y-auto pr-1">
                    {flatFiles.map((file) => {
                      const Icon = getFileIcon(file);
                      return (
                        <button
                          key={file}
                          type="button"
                          onClick={() => {
                            if (!autoSave) {
                              const currentTree = Object.keys(useIDEStore.getState().files).length > 0 
                                ? useIDEStore.getState().files 
                                : VITE_REACT_BASELINE;
                              useIDEStore.getState().setFiles(updateFileInTree(currentTree, activeFile, draftContent));
                            }
                            setActiveFile(file);
                          }}
                          className={`w-full rounded px-2 py-1.5 flex items-center gap-2 text-left text-xs font-mono transition-colors truncate ${
                            activeFile === file
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          <Icon size={14} className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{file}</span>
                        </button>
                      );
                    })}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle id="left-handle" className="w-1 bg-border/50 hover:bg-primary/50 transition-colors" />

        {/* ── MIDDLE PANE — Monaco Editor ─────────────────────────────────────── */}
        <ResizablePanel id="middle-panel" defaultSize={"45%"} minSize={"20%"} className="flex flex-col bg-background relative">
          {/* Tab bar */}
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-3">
              {leftCollapsed && (
                <button onClick={() => leftPanelRef.current?.expand()} className="text-muted-foreground hover:text-foreground">
                  <PanelLeftOpen size={16} />
                </button>
              )}
              <span className="rounded bg-accent px-2 py-0.5 text-xs font-mono text-accent-foreground">
                {activeFile}
                {draftContent !== getFileContentFromTree(tree, activeFile) && <span className="ml-1 text-yellow-500">•</span>}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {!autoSave && (
                <button 
                  onClick={handleManualSave}
                  disabled={isInstalling}
                  className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={14} />
                  Run / Sync
                </button>
              )}
              {rightCollapsed && (
                <button onClick={() => rightPanelRef.current?.expand()} className="text-muted-foreground hover:text-foreground">
                  <PanelRightOpen size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              path={"/sandbox/" + activeFile}
              height="100%"
              width="100%"
              theme="vs-dark"
              language={editorLanguage}
              value={draftContent}
              onChange={(val) => {
                if (val !== undefined) setDraftContent(val);
              }}
              beforeMount={(monaco) => {
                // Disable Monaco's built-in TS/JS type checker for sandbox files.
                // The editor displays WebContainer code (a Vite project) — Monaco
                // has no access to that project's node_modules or tsconfig,
                // so all type errors it reports are false positives.
                // We access the TS language service at runtime via the monaco instance
                // (the static import type marks it as deprecated, but it works fine).
                const ts = (monaco.languages as any).typescript;
                if (ts) {
                  ts.typescriptDefaults.setEagerModelSync(true);
                  ts.typescriptDefaults.setDiagnosticsOptions({
                    noSemanticValidation: true,
                    noSyntaxValidation: false,
                  });
                  ts.javascriptDefaults.setDiagnosticsOptions({
                    noSemanticValidation: true,
                    noSyntaxValidation: false,
                  });
                  ts.typescriptDefaults.setCompilerOptions({
                    jsx: ts.JsxEmit.ReactJSX,
                    allowSyntheticDefaultImports: true,
                    esModuleInterop: true,
                  });
                }
              }}
              onMount={(editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: typeof MonacoTypes) => {
                // Ctrl+S / Cmd+S → manual save
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                  () => { void handleManualSaveRef.current(); }
                );
              }}
              options={{
                fontSize: 13,
                fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                renderLineHighlight: "line",
                padding: { top: 12, bottom: 12 },
                automaticLayout: true,
                wordWrap: "off",
                readOnly: false,
              }}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle id="right-handle" className="w-1 bg-border/50 hover:bg-primary/50 transition-colors" />

        {/* ── RIGHT PANE — Preview + Terminal ──────────────────────────────────── */}
        <ResizablePanel 
          panelRef={rightPanelRef}
          id="right-panel"
          defaultSize={"35%"} 
          minSize={"15%"} 
          maxSize={"50%"}
          collapsible
          collapsedSize={"4%"}
          onResize={(size: any) => {
            const pct = typeof size === 'number' ? size : size.asPercentage;
            setRightCollapsed(pct < 5);
          }}
          className="flex flex-col overflow-hidden bg-[oklch(0.09_0.01_265)] transition-all duration-150 ease-in-out"
        >
          {rightCollapsed ? (
            <div className="flex h-full flex-col items-center justify-start py-4 overflow-hidden">
              <button
                onClick={() => rightPanelRef.current?.expand()}
                title="Expand preview"
                className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <PanelRightOpen size={18} />
              </button>
            </div>
          ) : (
            <ResizablePanelGroup id="right-inner-group" orientation="vertical">
              
              {/* Preview */}
              <ResizablePanel id="preview-panel" defaultSize={"70%"} minSize={"30%"} className="flex flex-col overflow-hidden border-b border-border bg-card">
                <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-card px-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <button onClick={() => rightPanelRef.current?.collapse()} className="text-muted-foreground hover:text-foreground">
                      <PanelRightClose size={16} />
                    </button>
                    Preview
                  </span>
                  
                  {previewUrl && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(previewUrl);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Copy URL"
                      >
                        {copiedUrl ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <button 
                        onClick={() => {
                          if (iframeRef.current) {
                            iframeRef.current.src += '';
                          }
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Hard Refresh"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {previewUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title="Vite dev server preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    className="h-full w-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[oklch(0.12_0.01_265)]">
                    <span className={`h-3 w-3 rounded-full ${statusColor[wcStatus]}`} />
                    <p className="text-sm text-muted-foreground font-mono">
                      {wcStatus === "error" ? wcError ?? "Boot failed" : `${wcStatus}…`}
                    </p>
                  </div>
                )}
              </ResizablePanel>

              <ResizableHandle withHandle className="h-1 bg-border/50 hover:bg-primary/50 transition-colors" />

              {/* Terminal */}
              <ResizablePanel id="terminal-panel" defaultSize={"30%"} minSize={"10%"} className="flex flex-col bg-[oklch(0.09_0.01_265)]">
                <div className="flex h-8 shrink-0 items-center border-b border-border px-3 gap-2">
                  <TerminalIcon size={14} className="text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Terminal
                  </span>
                </div>
                <div className="flex-1 overflow-hidden p-2">
                  <div ref={terminalRef} className="w-full h-full" />
                </div>
              </ResizablePanel>

            </ResizablePanelGroup>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
