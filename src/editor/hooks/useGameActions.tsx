/**
 * useGameActions.tsx
 *
 * Defines the `updateGameDocument` CopilotKit action.
 * The AI generates RFC 6902 JSON Patch operations which are applied
 * directly to the Zustand store → triggers SceneReconciler.
 */

import { useCopilotAction } from '@copilotkit/react-core';
import { useGameStore } from '../../core/state/GameDocumentStore';
import { runtimeState } from '../../core/state/RuntimeState';
import { useRef } from 'react';

interface PatchOp {
    op: string;
    path: string;
    value?: any;
}

export function useGameActions() {
    const applyPatch = useGameStore((s) => s.applyPatch);
    const lastPatchRef = useRef<string>('');
    const lastPatchTimeRef = useRef<number>(0);

    useCopilotAction({
        name: 'updateGameDocument',
        description:
            'Apply a set of JSON Patches (RFC 6902) to the game document. ' +
            'Use this for ALL scene modifications: adding nodes, changing positions, ' +
            'updating colors, resizing objects, removing nodes, etc. ' +
            'Paths are relative to the document root, e.g. /scenes/level_1/nodes/- to append a node.',
        parameters: [
            {
                name: 'patches',
                type: 'object[]' as const,
                description:
                    'Array of JSON Patch operations. Each has op, path, and optionally value.',
                attributes: [
                    {
                        name: 'op',
                        type: 'string' as const,
                        description: 'The operation: "add", "remove", or "replace"',
                        required: true,
                    },
                    {
                        name: 'path',
                        type: 'string' as const,
                        description:
                            'JSON Pointer path, e.g. /scenes/level_1/nodes/- (append) or /scenes/level_1/nodes/2/color (replace)',
                        required: true,
                    },
                    {
                        name: 'value',
                        type: 'object' as const,
                        description: 'The value for add/replace operations',
                        required: false,
                    },
                ],
            },
        ],
        handler: async ({ patches }: { patches: PatchOp[] }) => {
            // Guard: Don't allow modifications while game is playing
            if (runtimeState.isPlaying) {
                console.warn('[CopilotKit] 🛑 Cannot modify scene while game is playing');
                throw new Error('Cannot modify the scene while the game is playing. Stop the game first.');
            }

            const patchStr = JSON.stringify(patches);
            const now = Date.now();

            if (lastPatchRef.current === patchStr && now - lastPatchTimeRef.current < 2000) {
                console.log('[CopilotKit] 🛑 Ignoring duplicate patch request within 2s:', patches);
                return;
            }

            console.log('[CopilotKit] ✅ Applying patches:', patches);
            lastPatchRef.current = patchStr;
            lastPatchTimeRef.current = now;

            // Apply patches with Zod validation
            const result = applyPatch(patches as any);

            if (!result.success) {
                // Validation failed - throw error so CopilotKit sends it back to AI
                console.error('[CopilotKit] ❌ Patch validation failed:', result.error);
                throw new Error(result.error || 'Patch validation failed');
            }

            // Artificial delay to allow React state updates (useCopilotReadable)
            // to flush and be captured as the new context before the tool call completes.
            await new Promise((resolve) => setTimeout(resolve, 200));
        },
        render: ({ status, args }: any) => {
            if (status === 'inProgress') {
                return (
                    <div
                        style={{
                            padding: '8px 12px',
                            background: 'rgba(30, 30, 50, 0.9)',
                            borderRadius: '8px',
                            border: '1px solid rgba(100, 140, 255, 0.4)',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                        }}
                    >
                        <p style={{ color: '#7aa2ff', margin: '0 0 4px 0', fontWeight: 600 }}>
                            ⚡ Patching scene…
                        </p>
                        {args.patches?.map((p: PatchOp, i: number) => (
                            <div key={i} style={{ color: '#aaa' }}>
                                {p.op} {p.path}
                            </div>
                        ))}
                    </div>
                );
            }
            if (status === 'complete') {
                return (
                    <div
                        style={{
                            padding: '6px 12px',
                            background: 'rgba(30, 50, 30, 0.9)',
                            borderRadius: '8px',
                            border: '1px solid rgba(100, 255, 140, 0.4)',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#7aff9a',
                        }}
                    >
                        ✓ {args.patches?.length ?? 0} patch(es) applied
                    </div>
                );
            }
            return <></>;
        },
    }, []);
}
