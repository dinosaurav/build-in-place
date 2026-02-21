import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneReconciler } from './SceneReconciler';
import { GameDocument } from '../../schema/game.schema';
import * as BabylonCore from '@babylonjs/core';

describe('SceneReconciler', () => {
    let reconciler: SceneReconciler;
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
        mockCanvas = document.createElement('canvas');
        reconciler = new SceneReconciler(mockCanvas);
        vi.clearAllMocks(); // Clear spy counts
    });

    it('spawns a new mesh globally when a new node is added to the document', () => {
        const createBoxSpy = vi.spyOn(BabylonCore.MeshBuilder, 'CreateBox');

        const doc: GameDocument = {
            activeScene: 'test',
            scenes: {
                test: {
                    nodes: [
                        { id: 'box_1', type: 'mesh', primitive: 'box', position: [0, 0, 0] }
                    ]
                }
            }
        };

        reconciler.reconcile(doc);

        expect(createBoxSpy).toHaveBeenCalledTimes(1);
        expect((reconciler as any).nodeMap.has('box_1')).toBe(true);
    });

    it('updates position and scaling when properties change', () => {
        // Initial reconcile
        reconciler.reconcile({
            activeScene: 'test',
            scenes: { test: { nodes: [{ id: 'sphere_1', type: 'mesh', primitive: 'sphere', position: [0, 0, 0], size: 1 }] } }
        });

        const mesh = (reconciler as any).nodeMap.get('sphere_1');

        // Second reconcile with new values
        reconciler.reconcile({
            activeScene: 'test',
            scenes: { test: { nodes: [{ id: 'sphere_1', type: 'mesh', primitive: 'sphere', position: [10, 20, 30], size: 5 }] } }
        });

        expect(mesh.position.x).toBe(10);
        expect(mesh.position.y).toBe(20);
        expect(mesh.position.z).toBe(30);
        expect(mesh.scaling.x).toBe(5);
        expect(mesh.scaling.y).toBe(5);
        expect(mesh.scaling.z).toBe(5);
    });

    it('garbage collects meshes when they are removed from the document', () => {
        reconciler.reconcile({
            activeScene: 'test',
            scenes: { test: { nodes: [{ id: 'temp_node', type: 'mesh', primitive: 'box', position: [0, 0, 0] }] } }
        });

        const mesh = (reconciler as any).nodeMap.get('temp_node');
        expect(mesh).toBeDefined();

        // Reconcile with empty nodes
        reconciler.reconcile({
            activeScene: 'test',
            scenes: { test: { nodes: [] } }
        });

        expect(mesh.dispose).toHaveBeenCalledTimes(1);
        expect((reconciler as any).nodeMap.has('temp_node')).toBe(false);
    });
});
