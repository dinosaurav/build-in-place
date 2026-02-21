/**
 * SceneReconciler.ts
 *
 * Manages the lifecycle of Babylon.js objects so the 3D scene always
 * matches the authoritative GameDocument JSON, filtered through the
 * ephemeral RuntimeState (destroyed nodes, play-mode overrides).
 *
 * Responsibilities
 * ────────────────
 * 1. Initialise Babylon Engine, Scene, and Camera.
 * 2. Reconcile loop:
 *    • Node in JSON but not in scene  → Create it, attach components.
 *    • Node in JSON and in scene      → Update its properties.
 *    • Node marked destroyed          → Hide it (isVisible = false).
 *    • Node in scene but not in JSON  → Dispose it.
 */

import {
    Engine,
    Scene,
    ArcRotateCamera,
    HemisphericLight,
    MeshBuilder,
    Vector3,
    Color3,
    StandardMaterial,
    type AbstractMesh,
    type Node,
} from '@babylonjs/core';

import type { GameDocument, SceneNode } from '../../schema/game.schema';
import { runtimeState } from '../state/RuntimeState';
import { attachClickable } from '../components/clickable';
import type { EventBus } from '../bus/EventBus';

export class SceneReconciler {
    private engine: Engine;
    private scene: Scene;
    private nodeMap: Map<string, Node> = new Map();

    // Set after construction to break the circular dependency:
    // SceneReconciler ← EventBus ← SceneReconciler
    bus: EventBus | null = null;

    // ── Construction ─────────────────────────────────────────────────────────

    constructor(canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
        });

        this.scene = new Scene(this.engine);

        const camera = new ArcRotateCamera(
            '__editor_cam',
            Math.PI / 4,
            Math.PI / 3,
            12,
            Vector3.Zero(),
            this.scene,
        );
        camera.attachControl(canvas, true);
        camera.lowerRadiusLimit = 3;
        camera.upperRadiusLimit = 40;

        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener('resize', () => this.engine.resize());
    }

    getScene(): Scene {
        return this.scene;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    reconcile(doc: GameDocument): void {
        const sceneData = doc.scenes[doc.activeScene];
        if (!sceneData) {
            console.warn(`[Reconciler] No scene data for "${doc.activeScene}"`);
            return;
        }

        const visitedIds = new Set<string>();

        for (const node of sceneData.nodes) {
            visitedIds.add(node.id);

            let item = this.nodeMap.get(node.id);

            // 1. Create if missing
            if (!item) {
                item = this.createNode(node);
                this.nodeMap.set(node.id, item);

                // Attach components only on creation
                if (node.type === 'mesh' && node.components && this.bus) {
                    this.attachComponents(item as AbstractMesh, node);
                }
            }

            // 2. Update position
            this.updatePosition(item, node);

            // 3. Update mesh material
            if (node.type === 'mesh' && node.color) {
                this.updateMaterial(item as AbstractMesh, node);
            }

            // 4. Update light intensity
            if (node.type === 'light' && node.intensity !== undefined) {
                (item as HemisphericLight).intensity = node.intensity;
            }

            // 5. Respect destroyed-node state — hide or show
            if (node.type === 'mesh') {
                (item as AbstractMesh).isVisible = !runtimeState.isDestroyed(node.id);
            }
        }

        // Dispose orphans (nodes removed from the document)
        for (const [id, item] of this.nodeMap) {
            if (!visitedIds.has(id)) {
                item.dispose();
                this.nodeMap.delete(id);
            }
        }
    }

    dispose(): void {
        this.engine.stopRenderLoop();
        this.scene.dispose();
        this.engine.dispose();
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private createNode(node: SceneNode): Node {
        if (node.type === 'light') {
            const light = new HemisphericLight(
                node.id,
                new Vector3(0, 1, 0),
                this.scene,
            );
            light.intensity = node.intensity ?? 1;
            return light;
        }

        switch (node.primitive) {
            case 'ground':
                return MeshBuilder.CreateGround(
                    node.id,
                    { width: 10, height: 10 },
                    this.scene,
                );
            case 'sphere':
                return MeshBuilder.CreateSphere(node.id, { diameter: 1 }, this.scene);
            case 'box':
            default:
                return MeshBuilder.CreateBox(node.id, { size: 1 }, this.scene);
        }
    }

    private updatePosition(item: Node, node: SceneNode): void {
        const positionable = item as unknown as { position: Vector3 };
        if (positionable.position) {
            positionable.position.set(node.position[0], node.position[1], node.position[2]);
        }
    }

    private updateMaterial(mesh: AbstractMesh, node: SceneNode): void {
        if (!node.color) return;

        const matName = `mat_${node.id}`;
        let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;

        if (!mat) {
            mat = new StandardMaterial(matName, this.scene);
        }

        mat.diffuseColor = Color3.FromHexString(node.color);
        mesh.material = mat;
    }

    private attachComponents(mesh: AbstractMesh, node: SceneNode): void {
        if (!node.components || !this.bus) return;

        for (const component of node.components) {
            switch (component.type) {
                case 'clickable':
                    attachClickable(mesh, component, this.scene, this.bus);
                    break;
                // Phase 2: rotate, keybind, collectible
            }
        }
    }
}
