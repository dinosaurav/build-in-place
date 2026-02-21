/**
 * GameDocumentStore.ts
 *
 * Reactive store for the live GameDocument.
 *
 * Uses vanilla Zustand (createStore) so it can be consumed both:
 *  - Imperatively by EventBus / reconciler
 *  - Via React hooks by the editor UI (useStore)
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { applyPatch as applyJsonPatch, type Operation } from 'fast-json-patch';
import type { GameDocument } from '../../schema/game.schema';
import { runtimeState } from './RuntimeState';

// ── Store shape ───────────────────────────────────────────────────────────────

interface GameDocumentState {
    doc: GameDocument;
    /** Replace the entire document (triggers all subscribers). */
    setDoc: (doc: GameDocument) => void;
    /** Patch helper — returns a fresh object so Zustand detects the change. */
    patchDoc: (updater: (draft: GameDocument) => void) => void;
    /** Apply RFC 6902 JSON Patch operations (used by CopilotKit). */
    applyPatch: (patches: Operation[]) => void;
}

// ── Store instance ────────────────────────────────────────────────────────────

export const gameDocumentStore = createStore<GameDocumentState>()((set, get) => ({
    doc: undefined as unknown as GameDocument,

    setDoc(doc) {
        const sceneData = doc.scenes[doc.activeScene];
        if (sceneData?.variables) {
            runtimeState.initVariables(sceneData.variables);
        }
        set({ doc });
    },

    patchDoc(updater) {
        const draft = structuredClone(get().doc);
        updater(draft);
        get().setDoc(draft);
    },

    applyPatch(patches) {
        console.log('[GameDocumentStore] applyPatch called with:', JSON.stringify(patches, null, 2));
        try {
            const draft = structuredClone(get().doc);
            const activeScene = draft.activeScene;

            // Pre-process patches:
            //  1) Auto-prefix shorthand paths like /nodes/- → /scenes/{activeScene}/nodes/-
            //  2) Resolve "-" append paths to actual array indices
            const resolved = patches.map((p: any) => {
                let path: string = p.path ?? '';

                // Normalize shorthand paths
                const shorthandPrefixes = ['/nodes', '/variables', '/subscriptions'];
                for (const prefix of shorthandPrefixes) {
                    if (path.startsWith(prefix)) {
                        path = `/scenes/${activeScene}${path}`;
                        break;
                    }
                }

                // Resolve "-" append
                if (path.endsWith('/-') && p.op === 'add') {
                    const parentPath = path.slice(0, -2);
                    const segments = parentPath.split('/').filter(Boolean);
                    let target: any = draft;
                    for (const seg of segments) {
                        if (target === undefined || target === null) {
                            console.warn(`[GameDocumentStore] Path segment "${seg}" hit undefined. Full path: ${path}`);
                            break;
                        }
                        target = target[seg];
                    }
                    if (Array.isArray(target)) {
                        path = `${parentPath}/${target.length}`;
                        console.log(`[GameDocumentStore] Resolved append: ${p.path} → ${path}`);
                    } else {
                        console.warn(`[GameDocumentStore] Target for append is not an array:`, target, `Path: ${path}`);
                    }
                }

                return { ...p, path };
            });

            console.log('[GameDocumentStore] Resolved patches:', JSON.stringify(resolved, null, 2));
            applyJsonPatch(draft, resolved);
            console.log('[GameDocumentStore] Patch applied successfully.', draft.scenes[draft.activeScene]?.nodes?.length ?? 0, 'nodes');
            get().setDoc(draft);
        } catch (err) {
            console.error('[GameDocumentStore] applyPatch FAILED:', err);
            console.error('[GameDocumentStore] Input patches were:', JSON.stringify(patches, null, 2));
        }
    },
}));

// ── Typed accessors ───────────────────────────────────────────────────────────

export function getGame(): GameDocument {
    return gameDocumentStore.getState().doc;
}

// ── React hook (for editor components) ────────────────────────────────────────

export function useGameStore(): GameDocumentState;
export function useGameStore<T>(selector: (s: GameDocumentState) => T): T;
export function useGameStore<T>(selector?: (s: GameDocumentState) => T) {
    return useStore(gameDocumentStore, selector as any);
}
