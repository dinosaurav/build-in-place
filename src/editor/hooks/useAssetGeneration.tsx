/**
 * useAssetGeneration.tsx
 *
 * CopilotKit action for AI-driven 3D asset generation.
 * Currently simulates asset generation with placeholder URLs.
 * Can be extended to integrate with real 3D generation APIs (DALL-E, Meshy, etc.)
 */

import { useCopilotAction } from '@copilotkit/react-core';
import { useGameStore } from '../../core/state/GameDocumentStore';
import { runtimeState } from '../../core/state/RuntimeState';

/**
 * Mock asset library - simulates 3D asset generation
 * Replace with actual API calls in production
 */
const MOCK_ASSET_LIBRARY: Record<string, string> = {
    tree: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    character: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    rock: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    building: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
    vehicle: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
};

/**
 * Simulates calling a 3D generation API
 * In production, this would call services like:
 * - Meshy.ai
 * - OpenAI DALL-E (for textures)
 * - Stable Diffusion 3D
 * - Custom model endpoints
 */
async function simulateAssetGeneration(description: string): Promise<string> {
    console.log(`[AssetGen] Simulating generation for: "${description}"`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simple keyword matching to pick a placeholder
    const lowerDesc = description.toLowerCase();
    for (const [keyword, url] of Object.entries(MOCK_ASSET_LIBRARY)) {
        if (lowerDesc.includes(keyword)) {
            console.log(`[AssetGen] Matched keyword "${keyword}", using placeholder URL`);
            return url;
        }
    }

    // Default fallback
    console.log('[AssetGen] No keyword match, using default placeholder');
    return MOCK_ASSET_LIBRARY.tree;
}

export function useAssetGeneration() {
    const applyPatch = useGameStore((s) => s.applyPatch);

    useCopilotAction({
        name: 'generateAsset',
        description:
            'Generate a 3D asset based on a text description and add it to the asset manifest. ' +
            'Use this when the user asks to add objects that are not basic primitives (box, sphere, ground). ' +
            'After generating the asset, you can create nodes that reference it.',
        parameters: [
            {
                name: 'assetKey',
                type: 'string' as const,
                description:
                    'Unique identifier for this asset (e.g., "spooky_tree", "red_car"). Use snake_case.',
                required: true,
            },
            {
                name: 'description',
                type: 'string' as const,
                description:
                    'Detailed description of the 3D asset to generate (e.g., "a spooky dead tree with twisted branches")',
                required: true,
            },
            {
                name: 'autoPlace',
                type: 'boolean' as const,
                description:
                    'If true, automatically create a node using this asset after generation. Defaults to true.',
                required: false,
            },
        ],
        handler: async ({
            assetKey,
            description,
            autoPlace = true,
        }: {
            assetKey: string;
            description: string;
            autoPlace?: boolean;
        }) => {
            // Guard: Don't allow modifications while game is playing
            if (runtimeState.isPlaying) {
                console.warn('[AssetGen] 🛑 Cannot generate assets while game is playing');
                throw new Error('Cannot generate assets while the game is playing. Stop the game first.');
            }

            console.log('[AssetGen] Handler called:', { assetKey, description, autoPlace });

            try {
                // Step 1: Generate the asset (currently simulated)
                const assetUrl = await simulateAssetGeneration(description);

                // Step 2: Add to asset manifest
                const patches: any[] = [
                    {
                        op: 'add',
                        path: `/assets/${assetKey}`,
                        value: {
                            type: 'glb',
                            url: assetUrl,
                            metadata: {
                                name: assetKey,
                                description: description,
                                generatedAt: new Date().toISOString(),
                            },
                        },
                    },
                ];

                // Step 3: Optionally create a node using this asset
                if (autoPlace) {
                    patches.push({
                        op: 'add',
                        path: '/nodes/-',
                        value: {
                            id: `${assetKey}_instance`,
                            type: 'mesh',
                            asset: assetKey,
                            position: [0, 0, 0],
                            size: 1,
                        },
                    });
                }

                console.log('[AssetGen] Applying patches:', patches);
                applyPatch(patches);

                return `Asset "${assetKey}" generated and added to manifest. ${
                    autoPlace ? 'Node created at origin (0, 0, 0).' : 'Use it by setting asset: "${assetKey}" on a node.'
                }`;
            } catch (error) {
                console.error('[AssetGen] Failed to generate asset:', error);
                throw new Error(`Failed to generate asset: ${error}`);
            }
        },
        render: ({ status, args }: any) => {
            if (status === 'inProgress') {
                return (
                    <div
                        style={{
                            padding: '10px 14px',
                            background: 'linear-gradient(135deg, rgba(80, 40, 120, 0.9), rgba(40, 40, 80, 0.9))',
                            borderRadius: '10px',
                            border: '1px solid rgba(180, 120, 255, 0.4)',
                            fontFamily: 'system-ui, sans-serif',
                            fontSize: '12px',
                        }}
                    >
                        <p
                            style={{
                                color: '#d4b5ff',
                                margin: '0 0 6px 0',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>🎨</span>
                            Generating 3D asset...
                        </p>
                        <div style={{ color: '#b5b5d5', marginLeft: '22px' }}>
                            <div>Asset: {args.assetKey}</div>
                            <div style={{ fontStyle: 'italic', opacity: 0.8, marginTop: '2px' }}>
                                "{args.description}"
                            </div>
                        </div>
                    </div>
                );
            }
            if (status === 'complete') {
                return (
                    <div
                        style={{
                            padding: '8px 14px',
                            background: 'rgba(40, 80, 40, 0.9)',
                            borderRadius: '10px',
                            border: '1px solid rgba(100, 255, 140, 0.4)',
                            fontFamily: 'system-ui, sans-serif',
                            fontSize: '12px',
                            color: '#90ff9a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>✨</span>
                        Asset "{args.assetKey}" added to scene
                    </div>
                );
            }
            return null;
        },
    });
}
