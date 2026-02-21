import type { Action } from '../../schema/game.schema';
import { runtimeState } from '../state/RuntimeState';
import { getGame, gameDocumentStore } from '../state/GameDocumentStore';
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

        case 'transition_scene': {
            const doc = getGame();
            const targetScene = action.to;

            // Validate target scene exists
            if (!doc.scenes[targetScene]) {
                console.error(`[ActionExecutor] Cannot transition to unknown scene: "${targetScene}"`);
                break;
            }

            // 1. Capture variables to persist
            const persistedVars: Record<string, number> = {};
            if (action.persistVars && action.persistVars.length > 0) {
                for (const varKey of action.persistVars) {
                    persistedVars[varKey] = runtimeState.getVariable(varKey);
                }
                console.log('[ActionExecutor] Persisting variables across transition:', persistedVars);
            }

            // 2. Reset runtime state (clear destroyed nodes, variables)
            // BUT preserve isPlaying flag
            const wasPlaying = runtimeState.isPlaying;
            runtimeState.destroyedNodes.clear();

            // 3. Update the active scene in the document
            gameDocumentStore.getState().patchDoc((draft) => {
                draft.activeScene = targetScene;
            });

            // 4. Initialize new scene's variables (read fresh doc after update)
            const updatedDoc = getGame();
            const newSceneData = updatedDoc.scenes[targetScene];
            if (newSceneData?.variables) {
                runtimeState.initVariables(newSceneData.variables);
            }

            // 5. Restore persisted variables (override scene defaults)
            for (const [key, value] of Object.entries(persistedVars)) {
                runtimeState.setVariable(key, value);
            }

            // 6. Restore playing state and reconcile
            runtimeState.isPlaying = wasPlaying;
            reconciler.reconcile(getGame());

            console.log(`[ActionExecutor] Transitioned to scene: "${targetScene}"`);
            break;
        }

        default:
            console.warn('[ActionExecutor] Unknown action type:', (action as any).type);
    }
};
