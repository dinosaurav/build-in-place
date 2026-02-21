/**
 * useGameContext.ts
 *
 * Exposes the live GameDocument to CopilotKit as readable context.
 * The AI can see the current nodes, variables, and subscriptions
 * so it knows what exists before generating patches.
 */

import { useCopilotReadable } from '@copilotkit/react-core';
import { useGameStore } from '../../core/state/GameDocumentStore';

export function useGameContext() {
    const doc = useGameStore((s) => s.doc);

    const activeScene = doc?.scenes?.[doc.activeScene];

    useCopilotReadable({
        description:
            'The current 3D game document. Contains all scene nodes (meshes, lights) with their IDs, positions, colors, sizes, and components. Also contains variables and event subscriptions.',
        value: activeScene
            ? {
                activeScene: doc.activeScene,
                nodes: activeScene.nodes,
                variables: activeScene.variables ?? {},
                subscriptions: activeScene.subscriptions ?? [],
            }
            : null,
    });
}
