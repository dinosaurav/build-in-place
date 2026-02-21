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

export interface EventPayload {
    nodeId?: string;
    [key: string]: unknown;
}

export class EventBus {
    constructor(private reconciler: SceneReconciler) { }

    // ── Public ────────────────────────────────────────────────────────────

    publish(eventName: string, payload: EventPayload = {}): void {
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
            switch (action.type) {
                case 'increment': {
                    const current = runtimeState.getVariable(action.target);
                    runtimeState.setVariable(action.target, current + action.value);
                    break;
                }

                case 'destroy_node': {
                    const targetId =
                        action.target === '$event.node'
                            ? (payload.nodeId ?? '')
                            : action.target;

                    if (targetId) {
                        runtimeState.markDestroyed(targetId);
                        // Immediately reconcile so the mesh disappears
                        this.reconciler.reconcile(getGame());
                    }
                    break;
                }
            }
        }
    }
}
