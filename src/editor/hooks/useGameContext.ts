/**
 * useGameContext.ts
 *
 * Exposes the live GameDocument to CopilotKit as readable context.
 * The AI can see the current nodes, variables, and subscriptions
 * so it knows what exists before generating patches.
 */

import { useCopilotReadable } from '@copilotkit/react-core';
import { useGameStore } from '../../core/state/GameDocumentStore';
import { useEffect } from 'react';

export function useGameContext() {
    const doc = useGameStore((s) => s.doc);

    const activeScene = doc?.scenes?.[doc.activeScene];

    // Extract available textures from the asset manifest
    const availableTextures = doc?.assets
        ? Object.entries(doc.assets)
            .filter(([_, asset]) => asset.type === 'texture')
            .map(([key, asset]) => ({
                key,
                description: asset.metadata?.description || 'No description',
                resolution: asset.metadata?.resolution || 'Unknown',
            }))
        : [];

    useEffect(() => {
        if (activeScene) {
            console.log('[CopilotKit State Sync] Context updated for LLM with nodes:', activeScene.nodes.length);
            if (availableTextures.length > 0) {
                console.log('[CopilotKit State Sync] Available textures:', availableTextures.length);
            }
        }
    }, [activeScene, availableTextures.length]);

    useCopilotReadable({
        description:
            'The current 3D game document. Contains all scene nodes (meshes, lights) with their IDs, positions, colors, sizes, and components. Also contains variables, event subscriptions, and available textures that can be reused.',
        value: activeScene
            ? {
                activeScene: doc.activeScene,
                nodes: activeScene.nodes,
                variables: activeScene.variables ?? {},
                subscriptions: activeScene.subscriptions ?? [],
                availableTextures: availableTextures,
            }
            : null,
    });
}
