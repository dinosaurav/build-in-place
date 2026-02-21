/**
 * validator.test.ts
 *
 * Tests for Zod validation logic
 */

import { describe, it, expect } from 'vitest';
import { validatePatches, GameDocumentSchema } from './validator';
import type { GameDocument } from './game.schema';

describe('validator', () => {
    const validDoc: GameDocument = {
        activeScene: 'test_scene',
        scenes: {
            test_scene: {
                nodes: [
                    {
                        id: 'node1',
                        type: 'mesh',
                        primitive: 'box',
                        position: [0, 0, 0],
                        color: '#ff0000',
                    },
                ],
            },
        },
    };

    describe('GameDocumentSchema', () => {
        it('validates a correct game document', () => {
            const result = GameDocumentSchema.safeParse(validDoc);
            expect(result.success).toBe(true);
        });

        it('rejects a document with invalid color format', () => {
            const invalidDoc = {
                ...validDoc,
                scenes: {
                    test_scene: {
                        nodes: [
                            {
                                id: 'node1',
                                type: 'mesh',
                                primitive: 'box',
                                position: [0, 0, 0],
                                color: 'red', // Invalid: not a hex color
                            },
                        ],
                    },
                },
            };

            const result = GameDocumentSchema.safeParse(invalidDoc);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].path).toContain('color');
            }
        });

        it('rejects a document with invalid position array', () => {
            const invalidDoc = {
                ...validDoc,
                scenes: {
                    test_scene: {
                        nodes: [
                            {
                                id: 'node1',
                                type: 'mesh',
                                primitive: 'box',
                                position: [0, 0], // Invalid: should be [x, y, z]
                            },
                        ],
                    },
                },
            };

            const result = GameDocumentSchema.safeParse(invalidDoc);
            expect(result.success).toBe(false);
        });

        it('rejects a document with empty node id', () => {
            const invalidDoc = {
                ...validDoc,
                scenes: {
                    test_scene: {
                        nodes: [
                            {
                                id: '', // Invalid: empty string
                                type: 'mesh',
                                primitive: 'box',
                                position: [0, 0, 0],
                            },
                        ],
                    },
                },
            };

            const result = GameDocumentSchema.safeParse(invalidDoc);
            expect(result.success).toBe(false);
        });

        it('accepts assets with valid URLs', () => {
            const docWithAssets: GameDocument = {
                ...validDoc,
                assets: {
                    tree_model: {
                        type: 'glb',
                        url: 'https://example.com/tree.glb',
                    },
                },
            };

            const result = GameDocumentSchema.safeParse(docWithAssets);
            expect(result.success).toBe(true);
        });

        it('rejects assets with invalid URLs', () => {
            const invalidDoc = {
                ...validDoc,
                assets: {
                    tree_model: {
                        type: 'glb',
                        url: 'not-a-url', // Invalid URL
                    },
                },
            };

            const result = GameDocumentSchema.safeParse(invalidDoc);
            expect(result.success).toBe(false);
        });
    });

    describe('validatePatches', () => {
        it('validates and applies a correct patch', () => {
            const patches = [
                {
                    op: 'replace' as const,
                    path: '/scenes/test_scene/nodes/0/color',
                    value: '#00ff00',
                },
            ];

            const result = validatePatches(validDoc, patches);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.scenes.test_scene.nodes[0].color).toBe('#00ff00');
        });

        it('rejects a patch that creates invalid state', () => {
            const patches = [
                {
                    op: 'replace' as const,
                    path: '/scenes/test_scene/nodes/0/color',
                    value: 'invalid-color', // Not a hex color
                },
            ];

            const result = validatePatches(validDoc, patches);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('color');
        });

        it('rejects a patch that breaks position array structure', () => {
            const patches = [
                {
                    op: 'replace' as const,
                    path: '/scenes/test_scene/nodes/0/position',
                    value: [0, 0], // Should be [x, y, z]
                },
            ];

            const result = validatePatches(validDoc, patches);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('rejects a patch that creates an empty node id', () => {
            const patches = [
                {
                    op: 'replace' as const,
                    path: '/scenes/test_scene/nodes/0/id',
                    value: '',
                },
            ];

            const result = validatePatches(validDoc, patches);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('validates adding a new node with all required fields', () => {
            const patches = [
                {
                    op: 'add' as const,
                    path: '/scenes/test_scene/nodes/1',
                    value: {
                        id: 'new_node',
                        type: 'mesh',
                        primitive: 'sphere',
                        position: [1, 2, 3],
                        color: '#0000ff',
                    },
                },
            ];

            const result = validatePatches(validDoc, patches);

            expect(result.success).toBe(true);
            expect(result.data!.scenes.test_scene.nodes).toHaveLength(2);
        });

        it('provides helpful error messages for AI self-correction', () => {
            const patches = [
                {
                    op: 'add' as const,
                    path: '/scenes/test_scene/nodes/1',
                    value: {
                        id: 'bad_node',
                        type: 'mesh',
                        position: 'not-an-array', // Wrong type
                    },
                },
            ];

            const result = validatePatches(validDoc, patches);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Validation failed');
        });
    });
});
