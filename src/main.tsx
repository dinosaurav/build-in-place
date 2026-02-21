/**
 * main.tsx — Phase 1 CopilotKit entry point.
 *
 * Mounts the React-based EditorApp which internally bootstraps
 * Babylon.js, wires the EventBus + store, and provides
 * the CopilotKit sidebar for AI-driven scene editing.
 */

import { createRoot } from 'react-dom/client';
import { EditorApp } from './editor/EditorApp';

const root = document.getElementById('app');
if (!root) throw new Error('#app container not found');

createRoot(root).render(<EditorApp />);
