/**
 * @file src/features/file-explorer/index.ts
 * @description Public barrel for the File Explorer feature.
 *
 * The File Explorer feature is responsible for:
 * - Rendering the virtual file tree from the WebContainer FS
 * - Handling file/folder create, rename, delete actions
 * - Emitting "open file" events to the Editor feature
 *
 * Internal modules: components/, hooks/, types.ts
 */

// Re-export public API as the feature grows.
// e.g. export { FileTree } from './components/FileTree';
