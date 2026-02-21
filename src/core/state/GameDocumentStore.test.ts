import { describe, it, expect, beforeEach } from 'vitest';
import { gameDocumentStore } from './GameDocumentStore';
import { mockGameDoc, GameDocument } from '../../schema/game.schema';

describe('GameDocumentStore', () => {
    beforeEach(() => {
        // Reset store with fresh mock data
        gameDocumentStore.getState().setDoc(structuredClone(mockGameDoc));
    });

    it('initializes with the provided document via setDoc', () => {
        const currentDoc = gameDocumentStore.getState().doc;
        expect(currentDoc).toEqual(mockGameDoc);
        expect(currentDoc.activeScene).toBe('level_1');
    });

    it('applies a standard RFC 6902 replace operation', () => {
        gameDocumentStore.getState().applyPatch([
            { op: 'replace', path: '/scenes/level_1/nodes/0/color', value: '#123456' }
        ]);

        const modifiedDoc = gameDocumentStore.getState().doc;
        expect(modifiedDoc.scenes.level_1.nodes[0].color).toBe('#123456');
    });

    it('auto-prefixes shorthand paths with /scenes/{activeScene}', () => {
        gameDocumentStore.getState().applyPatch([
            { op: 'replace', path: '/nodes/1/color', value: '#999999' }
        ]);

        const modifiedDoc = gameDocumentStore.getState().doc;
        expect(modifiedDoc.scenes.level_1.nodes[1].color).toBe('#999999');
    });

    it('resolves "-" append syntax to actual array indices', () => {
        const initialNodesCount = mockGameDoc.scenes.level_1.nodes.length;

        gameDocumentStore.getState().applyPatch([
            {
                op: 'add',
                path: '/nodes/-',
                value: { id: 'test_node', type: 'mesh', primitive: 'box', position: [0, 0, 0] }
            }
        ]);

        const modifiedDoc = gameDocumentStore.getState().doc;
        expect(modifiedDoc.scenes.level_1.nodes.length).toBe(initialNodesCount + 1);
        expect(modifiedDoc.scenes.level_1.nodes[initialNodesCount].id).toBe('test_node');
    });

    it('handles identical duplicate patches robustly (e.g., AI double execution)', () => {
        const initialNodesCount = mockGameDoc.scenes.level_1.nodes.length;

        const doublePatch = [
            {
                op: 'add',
                path: '/nodes/-',
                value: { id: 'dupe_node', type: 'mesh', primitive: 'sphere', position: [0, 0, 0] }
            }
        ];

        // Apply it twice (this simulates the double execution error)
        gameDocumentStore.getState().applyPatch(doublePatch);
        gameDocumentStore.getState().applyPatch(doublePatch);

        const modifiedDoc = gameDocumentStore.getState().doc;
        // The `-` operator should resolve to array.length each time.
        // Even if applied twice, it appends two items. By testing this, we ensure
        // it doesn't crash on undefined paths. 
        expect(modifiedDoc.scenes.level_1.nodes.length).toBe(initialNodesCount + 2);
    });

    it('maintains state references causing React updates via draft clone', () => {
        const originalDoc = gameDocumentStore.getState().doc;

        gameDocumentStore.getState().patchDoc((draft) => {
            draft.activeScene = 'some_new_scene';
        });

        const newDoc = gameDocumentStore.getState().doc;
        expect(newDoc).not.toBe(originalDoc); // Must be a new reference
        expect(newDoc.activeScene).toBe('some_new_scene');
    });
});
