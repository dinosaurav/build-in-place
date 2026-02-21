/**
 * useSceneNavigation.tsx
 *
 * CopilotKit action for AI-driven scene navigation.
 * Enables conversational scene transitions like "take me to the boss room"
 * and provides context about all available scenes to the AI.
 */

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useGameStore, gameDocumentStore } from '../../core/state/GameDocumentStore';
import { runtimeState } from '../../core/state/RuntimeState';

export function useSceneNavigation() {
    const doc = useGameStore((s) => s.doc);
    const patchDoc = useGameStore((s) => s.patchDoc);

    // Expose all available scenes to the AI context
    useCopilotReadable({
        description: 'List of all available scenes in the game',
        value: doc
            ? {
                  currentScene: doc.activeScene,
                  availableScenes: Object.keys(doc.scenes || {}),
                  sceneDetails: Object.entries(doc.scenes || {}).map(([id, data]) => ({
                      id,
                      nodeCount: data.nodes.length,
                      hasVariables: !!data.variables && Object.keys(data.variables).length > 0,
                      hasSubscriptions: !!data.subscriptions && data.subscriptions.length > 0,
                  })),
              }
            : {
                  currentScene: '',
                  availableScenes: [],
                  sceneDetails: [],
              },
    });

    useCopilotAction({
        name: 'navigateToScene',
        description:
            'Navigate to a different scene in the game. Use this when the user wants to switch between levels, ' +
            'rooms, or areas. The AI can see all available scenes in the context.',
        parameters: [
            {
                name: 'sceneName',
                type: 'string' as const,
                description:
                    'The scene ID to navigate to (e.g., "level_1", "boss_room", "menu"). Must match an existing scene.',
                required: true,
            },
            {
                name: 'persistVariables',
                type: 'string[]' as const,
                description:
                    'Optional: Array of variable names to persist across the scene transition (e.g., ["score", "lives"])',
                required: false,
            },
        ],
        available: 'enabled', // Always available, even during play
        handler: async ({
            sceneName,
            persistVariables = [],
        }: {
            sceneName: string;
            persistVariables?: string[];
        }) => {
            console.log('[SceneNav] Navigating to scene:', sceneName);

            // Guard against undefined doc
            if (!doc) {
                throw new Error('Game document not initialized');
            }

            // Validate scene exists
            if (!doc.scenes[sceneName]) {
                const availableScenes = Object.keys(doc.scenes).join(', ');
                throw new Error(
                    `Scene "${sceneName}" not found. Available scenes: ${availableScenes}`
                );
            }

            // If already on this scene, just acknowledge
            if (doc.activeScene === sceneName) {
                return `Already on scene "${sceneName}".`;
            }

            // Capture variables to persist
            const persistedVars: Record<string, number> = {};
            if (persistVariables && persistVariables.length > 0) {
                for (const varKey of persistVariables) {
                    persistedVars[varKey] = runtimeState.getVariable(varKey);
                }
                console.log('[SceneNav] Persisting variables:', persistedVars);
            }

            // Clear runtime state for scene transition
            const wasPlaying = runtimeState.isPlaying;
            runtimeState.destroyedNodes.clear();

            // Update active scene
            patchDoc((draft) => {
                draft.activeScene = sceneName;
            });

            // Initialize new scene variables
            const newSceneData = doc.scenes[sceneName];
            if (newSceneData?.variables) {
                runtimeState.initVariables(newSceneData.variables);
            }

            // Restore persisted variables
            for (const [key, value] of Object.entries(persistedVars)) {
                runtimeState.setVariable(key, value);
            }

            // Restore playing state
            runtimeState.isPlaying = wasPlaying;

            const persistMsg =
                persistVariables.length > 0
                    ? ` Persisted variables: ${persistVariables.join(', ')}`
                    : '';

            return `Navigated to scene "${sceneName}".${persistMsg}`;
        },
        render: ({ status, args }: any) => {
            if (status === 'inProgress') {
                return (
                    <div
                        style={{
                            padding: '10px 14px',
                            background: 'linear-gradient(135deg, rgba(40, 80, 120, 0.9), rgba(40, 40, 80, 0.9))',
                            borderRadius: '10px',
                            border: '1px solid rgba(120, 180, 255, 0.4)',
                            fontFamily: 'system-ui, sans-serif',
                            fontSize: '12px',
                        }}
                    >
                        <p
                            style={{
                                color: '#b5d4ff',
                                margin: '0 0 6px 0',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>🚪</span>
                            Transitioning to scene...
                        </p>
                        <div style={{ color: '#b5b5d5', marginLeft: '22px' }}>
                            <div>Scene: {args.sceneName}</div>
                            {args.persistVariables && args.persistVariables.length > 0 && (
                                <div style={{ opacity: 0.8, marginTop: '2px' }}>
                                    Persisting: {args.persistVariables.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
            if (status === 'complete') {
                return (
                    <div
                        style={{
                            padding: '8px 14px',
                            background: 'rgba(40, 80, 60, 0.9)',
                            borderRadius: '10px',
                            border: '1px solid rgba(100, 200, 140, 0.4)',
                            fontFamily: 'system-ui, sans-serif',
                            fontSize: '12px',
                            color: '#90ffa0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>📍</span>
                        Now in "{args.sceneName}"
                    </div>
                );
            }
            return null;
        },
    });
}
