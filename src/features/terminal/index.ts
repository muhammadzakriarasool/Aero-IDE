/**
 * @file src/features/terminal/index.ts
 * @description Public barrel for the Terminal feature.
 *
 * The Terminal feature is responsible for:
 * - Rendering terminal output from WebContainer processes (xterm.js in Phase 2)
 * - Accepting user input and piping it to the container's stdin
 * - Displaying command history
 *
 * Internal modules: components/, hooks/, types.ts
 */

// Re-export public API as the feature grows.
// e.g. export { TerminalPanel } from './components/TerminalPanel';
