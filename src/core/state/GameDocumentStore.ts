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
import { validatePatches } from '../../schema/validator';

// ── Store shape ───────────────────────────────────────────────────────────────

export interface PatchResult {
    success: boolean;
    error?: string;
}

interface GameDocumentState {
    doc: GameDocument;
    /** Replace the entire document (triggers all subscribers). */
    setDoc: (doc: GameDocument) => void;
    /** Patch helper — returns a fresh object so Zustand detects the change. */
    patchDoc: (updater: (draft: GameDocument) => void) => void;
    /** Apply RFC 6902 JSON Patch operations with Zod validation (used by CopilotKit). */
    applyPatch: (patches: Operation[]) => PatchResult;
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

    applyPatch(patches): PatchResult {
        console.log('[GameDocumentStore] applyPatch called with:', JSON.stringify(patches, null, 2));

        const currentDoc = get().doc;
        const activeScene = currentDoc.activeScene;

        // Step 1: Pre-process patches (normalize shorthand paths)
        const resolved = patches.map((p: any) => {
            let path: string = p.path ?? '';

            // Normalize shorthand paths like /nodes/- → /scenes/{activeScene}/nodes/-
            const shorthandPrefixes = ['/nodes', '/variables', '/subscriptions'];
            for (const prefix of shorthandPrefixes) {
                if (path.startsWith(prefix)) {
                    path = `/scenes/${activeScene}${path}`;
                    break;
                }
            }

            // Resolve "-" append paths to actual array indices
            if (path.endsWith('/-') && p.op === 'add') {
                const parentPath = path.slice(0, -2);
                const segments = parentPath.split('/').filter(Boolean);

                // Navigate to the target array in the current document
                let target: any = currentDoc;
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

        // Step 2: Validate patches using Zod
        const validation = validatePatches(currentDoc, resolved);

        if (!validation.success) {
            // Validation failed - return error to CopilotKit for AI self-correction
            console.error('[GameDocumentStore] Validation FAILED:', validation.error);
            console.error('[GameDocumentStore] Rejected patches:', JSON.stringify(resolved, null, 2));

            return {
                success: false,
                error: validation.error,
            };
        }

        // Step 3: Apply the validated document to state
        console.log(
            '[GameDocumentStore] Validation passed. Applying changes.',
            validation.data!.scenes[validation.data!.activeScene]?.nodes?.length ?? 0,
            'nodes'
        );

        get().setDoc(validation.data!);

        return {
            success: true,
        };
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
