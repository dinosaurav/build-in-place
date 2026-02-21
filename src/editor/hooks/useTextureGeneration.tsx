/**
 * useTextureGeneration.tsx
 *
 * CopilotKit action for AI-driven texture generation using NanoBanana (Google Gemini).
 * Generates PBR textures (base color, normal, roughness, etc.) for 3D objects.
 */

import { useCopilotAction } from '@copilotkit/react-core';
import { useGameStore } from '../../core/state/GameDocumentStore';
import { runtimeState } from '../../core/state/RuntimeState';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

/**
 * Generate a texture using NanoBanana (Gemini 2.5 Flash Image)
 * Returns a base64-encoded PNG image
 */
async function generateTextureWithNanoBanana(
    prompt: string,
    resolution: '1K' | '2K' | '4K' = '2K'
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error(
            'VITE_GEMINI_API_KEY not configured. Get your key at https://aistudio.google.com/apikey'
        );
    }

    console.log(`[NanoBanana] Generating texture: "${prompt}" at ${resolution}`);

    const model = 'gemini-2.5-flash-image'; // Fast, efficient model
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Enhance the prompt for better texture generation
    const texturePrompt = `A high quality photo of ${prompt} texture, seamless and tileable`;

    const requestBody = {
        contents: [
            {
                parts: [{ text: texturePrompt }],
            },
        ],
        generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
                aspectRatio: '1:1', // Square textures for seamless tiling
                imageSize: resolution,
            },
        },
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NanoBanana API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract base64 image from response
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (part: any) => part.inlineData?.mimeType === 'image/png'
        );

        if (!imagePart?.inlineData?.data) {
            console.error('[NanoBanana] Response structure:', JSON.stringify(data, null, 2));
            throw new Error('No image data in NanoBanana response');
        }

        console.log('[NanoBanana] ✅ Texture generated successfully');
        return imagePart.inlineData.data;
    } catch (error) {
        console.error('[NanoBanana] Failed to generate texture:', error);
        throw error;
    }
}

/**
 * Convert base64 image to data URL for use in BabylonJS
 */
function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Save texture to /public/textures/ via API endpoint
 * Returns the URL path if successful, or null if it fails
 */
async function saveTextureToDisk(
    textureKey: string,
    base64Data: string,
    resolution: string
): Promise<string | null> {
    try {
        // Generate descriptive filename: textureKey_resolution.png
        const filename = `${textureKey}_${resolution}.png`;

        const response = await fetch('/api/save-texture', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename,
                base64Data,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save texture');
        }

        const result = await response.json();
        console.log(`[TextureGen] ✅ Saved to disk: ${result.url}`);
        return result.url; // Returns "/textures/wood_oak_2K.png"
    } catch (error) {
        console.warn('[TextureGen] Failed to save to disk, using data URL:', error);
        return null;
    }
}

export function useTextureGeneration() {
    const applyPatch = useGameStore((s) => s.applyPatch);

    useCopilotAction(
        {
            name: 'generateTexture',
            description:
                'Generate a custom AI texture using NanoBanana (Google Gemini) and apply it to objects in the scene. ' +
                'Use this when the user asks for custom materials, surfaces, or textures (e.g., "make it look like wood", "add a brick texture", "rusted metal surface"). ' +
                'The texture will be added to the asset manifest and can be applied to any mesh node.',
            parameters: [
                {
                    name: 'textureKey',
                    type: 'string' as const,
                    description:
                        'Unique identifier for this texture (e.g., "wood_oak", "brick_red", "metal_rusty"). Use snake_case.',
                    required: true,
                },
                {
                    name: 'description',
                    type: 'string' as const,
                    description:
                        'Detailed description of the texture to generate (e.g., "dark oak wood grain", "red weathered brick wall", "rusty corroded metal plate")',
                    required: true,
                },
                {
                    name: 'resolution',
                    type: 'string' as const,
                    description:
                        'Output resolution: "1K" (1024x1024), "2K" (2048x2048), or "4K" (4096x4096). Default: "2K"',
                    required: false,
                },
                {
                    name: 'applyToNodes',
                    type: 'object' as const,
                    description:
                        'Optional: List of node IDs to apply this texture to after generation. Example: ["box_1", "floor"]',
                    required: false,
                },
            ],
            handler: async ({
                textureKey,
                description,
                resolution = '2K',
                applyToNodes = [],
            }: {
                textureKey: string;
                description: string;
                resolution?: '1K' | '2K' | '4K';
                applyToNodes?: string[];
            }) => {
                // Guard: Don't allow modifications while game is playing
                if (runtimeState.isPlaying) {
                    console.warn('[TextureGen] 🛑 Cannot generate textures while game is playing');
                    throw new Error(
                        'Cannot generate textures while the game is playing. Stop the game first.'
                    );
                }

                console.log('[TextureGen] Handler called:', {
                    textureKey,
                    description,
                    resolution,
                    applyToNodes,
                });

                try {
                    // Step 1: Generate the texture with NanoBanana
                    const base64Image = await generateTextureWithNanoBanana(description, resolution);

                    // Step 2: Try to save to disk, fall back to data URL
                    const savedUrl = await saveTextureToDisk(textureKey, base64Image, resolution);
                    const textureUrl = savedUrl || base64ToDataUrl(base64Image);

                    if (savedUrl) {
                        console.log(
                            `[TextureGen] 💾 Texture saved to /public${savedUrl} - reusable across sessions!`
                        );
                    } else {
                        console.log(
                            '[TextureGen] ⚠️ Using data URL (not persisted) - texture will be lost on reload'
                        );
                    }

                    // Step 3: Add texture to asset manifest
                    const patches: any[] = [
                        {
                            op: 'add',
                            path: `/assets/${textureKey}`,
                            value: {
                                type: 'texture',
                                url: textureUrl, // Persistent file URL or data URL fallback
                                metadata: {
                                    name: textureKey,
                                    description: description,
                                    resolution: resolution,
                                    generatedAt: new Date().toISOString(),
                                    generator: 'NanoBanana (Gemini 2.5 Flash Image)',
                                    persistent: !!savedUrl, // Flag to indicate if it's saved to disk
                                },
                            },
                        },
                    ];

                    // Step 3: Apply texture to specified nodes if requested
                    if (applyToNodes && applyToNodes.length > 0) {
                        for (const nodeId of applyToNodes) {
                            // Find the node index
                            const doc = useGameStore.getState().doc;
                            const activeScene = doc.activeScene;
                            const nodes = doc.scenes[activeScene]?.nodes || [];
                            const nodeIndex = nodes.findIndex((n) => n.id === nodeId);

                            if (nodeIndex !== -1) {
                                const node = nodes[nodeIndex];
                                const hasTexture = 'texture' in node;

                                patches.push({
                                    op: hasTexture ? 'replace' : 'add',
                                    path: `/scenes/${activeScene}/nodes/${nodeIndex}/texture`,
                                    value: textureKey,
                                });
                            } else {
                                console.warn(
                                    `[TextureGen] Node "${nodeId}" not found in active scene`
                                );
                            }
                        }
                    }

                    console.log('[TextureGen] Applying patches:', patches);
                    const result = applyPatch(patches);

                    if (!result.success) {
                        console.error('[TextureGen] ❌ Patch validation failed:', result.error);
                        throw new Error(result.error || 'Failed to add texture to manifest');
                    }

                    return `Texture "${textureKey}" generated successfully using NanoBanana (${resolution}). ${
                        applyToNodes.length > 0
                            ? `Applied to ${applyToNodes.length} node(s).`
                            : 'Use it by setting texture: "' + textureKey + '" on a node.'
                    }`;
                } catch (error) {
                    console.error('[TextureGen] Failed to generate texture:', error);
                    throw new Error(`Failed to generate texture: ${error}`);
                }
            },
            render: ({ status, args }: any) => {
                if (status === 'inProgress') {
                    return (
                        <div
                            style={{
                                padding: '10px 14px',
                                background:
                                    'linear-gradient(135deg, rgba(120, 60, 180, 0.9), rgba(60, 60, 120, 0.9))',
                                borderRadius: '10px',
                                border: '1px solid rgba(200, 140, 255, 0.4)',
                                fontFamily: 'system-ui, sans-serif',
                                fontSize: '12px',
                            }}
                        >
                            <p
                                style={{
                                    color: '#e4c5ff',
                                    margin: '0 0 6px 0',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span style={{ fontSize: '16px' }}>🎨</span>
                                Generating texture with NanoBanana...
                            </p>
                            <div style={{ color: '#c5c5e5', marginLeft: '22px' }}>
                                <div>
                                    {args.textureKey} • {args.resolution || '2K'}
                                </div>
                                <div
                                    style={{ fontStyle: 'italic', opacity: 0.8, marginTop: '2px' }}
                                >
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
                            Texture "{args.textureKey}" generated and applied
                        </div>
                    );
                }
                return null;
            },
        },
        []
    );
}
