import type { Action } from '../../schema/game.schema';
import { runtimeState } from '../state/RuntimeState';
import { getGame } from '../state/GameDocumentStore';
import type { SceneReconciler } from '../reconciler/SceneReconciler';

/**
 * ActionExecutor
 *
 * Evaluates action directives encoded in JSON (e.g. `increment`, `destroy_node`)
 * against the live RuntimeState singleton.
 */
export const executeAction = (
    action: Action,
    payload: Record<string, any>,
    reconciler: SceneReconciler
) => {
    switch (action.type) {
        case 'increment': {
            const current = runtimeState.getVariable(action.target);
            runtimeState.setVariable(action.target, current + action.value);
            break;
        }

        case 'destroy_node': {
            // Resolve $event variables (like $event.node referencing the clicked mesh)
            const targetId =
                action.target === '$event.node'
                    ? (payload.nodeId ?? '')
                    : action.target;

            if (targetId) {
                runtimeState.markDestroyed(targetId);
                // Immediately reconcile so the mesh disappears
                reconciler.reconcile(getGame());
            }
            break;
        }

        default:
            console.warn('[ActionExecutor] Unknown action type:', (action as any).type);
    }
};
