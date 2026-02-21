/**
 * main.ts — Phase 1 entry point.
 *
 * Wiring order (matters to break the circular dep):
 *   1. Create SceneReconciler  (needs canvas)
 *   2. Create EventBus         (needs reconciler reference)
 *   3. Assign bus → reconciler (breaks the cycle)
 *   4. Init document store     (seeds RuntimeState variables)
 *   5. Initial reconcile
 *   6. Wire HUD reactively via "runtime:variable_changed"
 */

import { SceneReconciler } from './core/reconciler/SceneReconciler';
import { EventBus } from './core/bus/EventBus';
import { gameDocumentStore } from './core/state/GameDocumentStore';
import { runtimeState } from './core/state/RuntimeState';
import { mockGameDoc, type GameDocument } from './schema/game.schema';

// ── Bootstrap ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element #renderCanvas not found');

// 1 & 2 & 3 — wire reconciler ↔ bus
const reconciler = new SceneReconciler(canvas);
const bus = new EventBus(reconciler);
reconciler.bus = bus;

// 4 — seed document store (also seeds runtimeState.variables)
const liveDoc: GameDocument = structuredClone(mockGameDoc);
gameDocumentStore.getState().setDoc(liveDoc);

// 5 — initial reconcile
reconciler.reconcile(liveDoc);
runtimeState.isPlaying = true;

// ── HUD reactivity ────────────────────────────────────────────────────────

const scoreEl = document.getElementById('hud-score');

function refreshHud() {
    if (!scoreEl) return;
    const score = runtimeState.getVariable('score');
    scoreEl.textContent = `Score: ${score}`;
}

refreshHud(); // initial render

window.addEventListener('runtime:variable_changed', (e) => {
    const { key } = (e as CustomEvent<{ key: string; value: number }>).detail;
    if (key === 'score') refreshHud();
});

// ── Console helpers ───────────────────────────────────────────────────────

/**
 * Mutate the live document in-place and re-reconcile.
 * This is the hot-reload mechanism: the EventBus always reads from `liveDoc`
 * at publish time, so changing a subscription action value here takes effect
 * on the very next event.
 *
 * Usage:
 *   updateAndReconcile(doc => {
 *     doc.scenes.level_1.subscriptions[0].actions[0].value = 100;
 *   });
 */
function updateAndReconcile(mutator: (doc: GameDocument) => void): void {
    mutator(liveDoc);
    gameDocumentStore.getState().setDoc(liveDoc);
    reconciler.reconcile(liveDoc);
    console.log('[main] Reconciled.', structuredClone(liveDoc));
}

declare global {
    interface Window {
        updateAndReconcile: typeof updateAndReconcile;
        liveDoc: GameDocument;
        runtimeState: typeof runtimeState;
    }

    interface WindowEventMap {
        'runtime:variable_changed': CustomEvent<{ key: string; value: number }>;
    }
}

window.updateAndReconcile = updateAndReconcile;
window.liveDoc = liveDoc;
window.runtimeState = runtimeState;

console.log(
    '%c[Build-in-Place] Phase 1 loaded. Click the gold sphere!\n' +
    'Helpers: updateAndReconcile(fn), window.liveDoc, window.runtimeState',
    'color: #ffd700; font-weight: bold;',
);
