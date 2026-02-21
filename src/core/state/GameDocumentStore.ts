/**
 * GameDocumentStore.ts
 *
 * Minimal reactive store for the live GameDocument.
 *
 * Uses vanilla Zustand (no React hooks) — consumed imperatively by the
 * EventBus and reconciler.  A React editor layer (Phase 3) can subscribe
 * to this same store via `useStore(gameDocumentStore, ...)`.
 *
 * Why Zustand instead of a plain class?
 *  - Subscribe pattern baked in (`.subscribe(listener)`)
 *  - Trivially upgradeable to the full editor without changing consumers
 */

import { createStore } from 'zustand/vanilla';
import type { GameDocument } from '../../schema/game.schema';
import { runtimeState } from './RuntimeState';

// ── Store shape ───────────────────────────────────────────────────────────────

interface GameDocumentState {
    doc: GameDocument;

    /** Replace the entire document (triggers all subscribers). */
    setDoc: (doc: GameDocument) => void;

    /** Patch helper — returns a fresh object so Zustand detects the change. */
    patchDoc: (updater: (draft: GameDocument) => void) => void;
}

// ── Store factory ─────────────────────────────────────────────────────────────

export const gameDocumentStore = createStore<GameDocumentState>()((set, get) => ({
    doc: undefined as unknown as GameDocument, // Initialised by main.ts before use

    setDoc(doc) {
        // Re-seed runtime variables whenever the document changes (hot-reload)
        const sceneData = doc.scenes[doc.activeScene];
        if (sceneData?.variables) {
            runtimeState.initVariables(sceneData.variables);
        }
        set({ doc });
    },

    patchDoc(updater) {
        // Shallow-clone so Zustand sees a new reference
        const draft = structuredClone(get().doc);
        updater(draft);
        get().setDoc(draft);
    },
}));

// ── Typed accessors (used by EventBus) ───────────────────────────────────────

export function getGame(): GameDocument {
    return gameDocumentStore.getState().doc;
}
