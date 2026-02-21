/**
 * EventBus.ts
 *
 * The "heartbeat" of the runtime. Components call `bus.publish(event, payload)`
 * and the EventBus looks up subscriptions in the live GameDocument, then
 * executes their actions against RuntimeState.
 *
 * Why read from GameDocument every time?
 *  → Hot-reload. If you change action values mid-play (e.g. increment by 100),
 *    the very next publish picks up the new value immediately — no restart.
 */

import type { Action } from '../../schema/game.schema';
import { getGame } from '../state/GameDocumentStore';
import { runtimeState } from '../state/RuntimeState';
import type { SceneReconciler } from '../reconciler/SceneReconciler';
import { executeAction } from './ActionExecutor';

export interface EventPayload {
    nodeId?: string;
    [key: string]: unknown;
}

export class EventBus {
    constructor(private reconciler: SceneReconciler) { }

    // ── Public ────────────────────────────────────────────────────────────

    publish(eventName: string, payload: EventPayload = {}): void {
        // Guard: Do not process logic if the editor is stopped.
        if (!runtimeState.isPlaying) return;

        const doc = getGame();
        const sceneData = doc.scenes[doc.activeScene];
        if (!sceneData?.subscriptions) return;

        for (const sub of sceneData.subscriptions) {
            if (sub.on !== eventName) continue;

            // (Phase 2+) evaluate `sub.when` condition here if present
            this.executeActions(sub.actions, payload);
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────

    private executeActions(actions: Action[], payload: EventPayload): void {
        for (const action of actions) {
            executeAction(action, payload, this.reconciler);
        }
    }
}
