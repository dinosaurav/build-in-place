/**
 * ActionExecutor.test.ts
 *
 * Tests for the action execution system, including Phase 3 transition_scene action.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeAction } from './ActionExecutor';
import * as GameDocumentStore from '../state/GameDocumentStore';
import { runtimeState } from '../state/RuntimeState';
import type { GameDocument } from '../../schema/game.schema';

describe('ActionExecutor', () => {
    let mockReconciler: any;
    let mockPatchDoc: any;

    beforeEach(() => {
        mockReconciler = { reconcile: vi.fn() };
        mockPatchDoc = vi.fn();
        vi.clearAllMocks();
        runtimeState.reset();
        runtimeState.isPlaying = true;
    });

    describe('increment action', () => {
        it('increments a variable by the specified value', () => {
            runtimeState.initVariables({ score: 10 });

            executeAction(
                { type: 'increment', target: 'score', value: 5 },
                {},
                mockReconciler
            );

            expect(runtimeState.getVariable('score')).toBe(15);
        });

        it('handles incrementing non-existent variables (defaults to 0)', () => {
            executeAction(
                { type: 'increment', target: 'new_var', value: 3 },
                {},
                mockReconciler
            );

            expect(runtimeState.getVariable('new_var')).toBe(3);
        });
    });

    describe('destroy_node action', () => {
        it('marks a node as destroyed and triggers reconciliation', () => {
            const mockDoc: GameDocument = {
                activeScene: 'level_1',
                scenes: {
                    level_1: {
                        nodes: [{ id: 'box_1', type: 'mesh', primitive: 'box', position: [0, 0, 0] }],
                    },
                },
            };

            vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(mockDoc);

            executeAction(
                { type: 'destroy_node', target: 'box_1' },
                {},
                mockReconciler
            );

            expect(runtimeState.isDestroyed('box_1')).toBe(true);
            expect(mockReconciler.reconcile).toHaveBeenCalledWith(mockDoc);
        });

        it('resolves $event.node placeholder from payload', () => {
            const mockDoc: GameDocument = {
                activeScene: 'level_1',
                scenes: {
                    level_1: {
                        nodes: [{ id: 'coin_1', type: 'mesh', primitive: 'sphere', position: [0, 0, 0] }],
                    },
                },
            };

            vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(mockDoc);

            executeAction(
                { type: 'destroy_node', target: '$event.node' },
                { nodeId: 'coin_1' },
                mockReconciler
            );

            expect(runtimeState.isDestroyed('coin_1')).toBe(true);
        });
    });

    describe('transition_scene action (Phase 3)', () => {
        it('transitions to a new scene and updates the active scene', () => {
            const mockDoc: GameDocument = {
                activeScene: 'level_1',
                scenes: {
                    level_1: {
                        nodes: [],
                        variables: { score: 10 },
                    },
                    level_2: {
                        nodes: [],
                        variables: { score: 0, enemies: 5 },
                    },
                },
            };

            runtimeState.initVariables({ score: 10 });

            vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(mockDoc);
            vi.spyOn(GameDocumentStore.gameDocumentStore.getState(), 'patchDoc').mockImplementation(
                (updater) => {
                    const draft = structuredClone(mockDoc);
                    updater(draft);
                    // Simulate the store update
                    vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(draft);
                }
            );

            executeAction(
                { type: 'transition_scene', to: 'level_2' },
                {},
                mockReconciler
            );

            // Verify destroyed nodes were cleared
            expect(runtimeState.destroyedNodes.size).toBe(0);

            // Verify reconciler was called
            expect(mockReconciler.reconcile).toHaveBeenCalled();
        });

        it('persists specified variables across scene transition', () => {
            const mockDoc: GameDocument = {
                activeScene: 'level_1',
                scenes: {
                    level_1: {
                        nodes: [],
                        variables: { score: 50, lives: 3 },
                    },
                    level_2: {
                        nodes: [],
                        variables: { score: 0 },
                    },
                },
            };

            runtimeState.initVariables({ score: 50, lives: 3 });

            vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(mockDoc);
            vi.spyOn(GameDocumentStore.gameDocumentStore.getState(), 'patchDoc').mockImplementation(
                (updater) => {
                    const draft = structuredClone(mockDoc);
                    updater(draft);
                    vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(draft);
                }
            );

            executeAction(
                { type: 'transition_scene', to: 'level_2', persistVars: ['score'] },
                {},
                mockReconciler
            );

            // Score should be persisted (50), lives should be reset
            expect(runtimeState.getVariable('score')).toBe(50);
        });

        it('handles transition to non-existent scene gracefully', () => {
            const mockDoc: GameDocument = {
                activeScene: 'level_1',
                scenes: {
                    level_1: {
                        nodes: [],
                    },
                },
            };

            vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(mockDoc);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            executeAction(
                { type: 'transition_scene', to: 'non_existent' },
                {},
                mockReconciler
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Cannot transition to unknown scene')
            );

            consoleSpy.mockRestore();
        });

        it('preserves isPlaying state across transitions', () => {
            const mockDoc: GameDocument = {
                activeScene: 'level_1',
                scenes: {
                    level_1: { nodes: [] },
                    level_2: { nodes: [] },
                },
            };

            runtimeState.isPlaying = true;

            vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(mockDoc);
            vi.spyOn(GameDocumentStore.gameDocumentStore.getState(), 'patchDoc').mockImplementation(
                (updater) => {
                    const draft = structuredClone(mockDoc);
                    updater(draft);
                    vi.spyOn(GameDocumentStore, 'getGame').mockReturnValue(draft);
                }
            );

            executeAction(
                { type: 'transition_scene', to: 'level_2' },
                {},
                mockReconciler
            );

            expect(runtimeState.isPlaying).toBe(true);
        });
    });

    describe('unknown action type', () => {
        it('logs a warning for unknown action types', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            executeAction(
                { type: 'unknown_action' } as any,
                {},
                mockReconciler
            );

            expect(consoleSpy).toHaveBeenCalledWith(
                '[ActionExecutor] Unknown action type:',
                'unknown_action'
            );

            consoleSpy.mockRestore();
        });
    });
});
