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

import * as BABYLON from '@babylonjs/core';
import {
    Engine,
    Scene,
    ArcRotateCamera,
    HemisphericLight,
    MeshBuilder,
    Vector3,
    Color3,
    StandardMaterial,
    SceneLoader,
    type AbstractMesh,
    type Node,
    type AssetContainer,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import type { GameDocument, SceneNode } from '../../schema/game.schema';
import { runtimeState } from '../state/RuntimeState';
import { attachClickable } from '../components/clickable';
import type { EventBus } from '../bus/EventBus';

export class SceneReconciler {
    private engine: Engine;
    private scene: Scene;
    private nodeMap: Map<string, Node> = new Map();

    // Asset loading cache: URL → AssetContainer
    private assetCache: Map<string, AssetContainer> = new Map();

    // Track nodes currently loading assets: nodeId → asset URL
    private loadingNodes: Map<string, string> = new Map();

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
                item = this.createNode(node, doc);
                this.nodeMap.set(node.id, item);

                // Attach components only on creation
                if (node.type === 'mesh' && node.components && this.bus) {
                    this.attachComponents(item as AbstractMesh, node);
                }
            }

            // 2. Update position
            this.updatePosition(item, node);

            // 3. Update mesh material (color or texture)
            if (node.type === 'mesh' && (node.color || node.texture)) {
                this.updateMaterial(item as AbstractMesh, node, doc);
            }

            // 4. Update light intensity
            if (node.type === 'light' && node.intensity !== undefined) {
                (item as HemisphericLight).intensity = node.intensity;
            }

            // 5. Apply size / uniform scaling
            if (node.type === 'mesh' && node.size !== undefined) {
                (item as AbstractMesh).scaling.setAll(node.size);
            }

            // 6. Respect destroyed-node state — hide or show
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

        // Dispose all cached assets
        for (const container of this.assetCache.values()) {
            container.dispose();
        }
        this.assetCache.clear();
        this.loadingNodes.clear();

        this.scene.dispose();
        this.engine.dispose();
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private createNode(node: SceneNode, doc: GameDocument): Node {
        if (node.type === 'light') {
            const light = new HemisphericLight(
                node.id,
                new Vector3(0, 1, 0),
                this.scene,
            );
            light.intensity = node.intensity ?? 1;
            return light;
        }

        // Check if this node references an external asset
        if (node.asset && doc.assets) {
            const assetDef = doc.assets[node.asset];
            if (assetDef && assetDef.type === 'glb') {
                return this.createAssetNode(node, assetDef.url);
            } else if (assetDef) {
                console.warn(`[Reconciler] Unsupported asset type "${assetDef.type}" for node "${node.id}"`);
            } else {
                console.error(`[Reconciler] Asset "${node.asset}" not found in manifest for node "${node.id}"`);
            }
        }

        // Fallback to primitives
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

    private createAssetNode(node: SceneNode, assetUrl: string): Node {
        // Create a placeholder mesh immediately
        const placeholder = MeshBuilder.CreateBox(
            node.id,
            { size: 0.5 },
            this.scene,
        );

        // Apply a loading material
        const loadingMat = new StandardMaterial(`${node.id}_loading`, this.scene);
        loadingMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
        loadingMat.alpha = 0.5;
        placeholder.material = loadingMat;

        // Track that this node is loading
        this.loadingNodes.set(node.id, assetUrl);

        // Start async load
        this.loadAsset(assetUrl, node.id, placeholder);

        return placeholder;
    }

    private async loadAsset(url: string, nodeId: string, placeholder: AbstractMesh): Promise<void> {
        try {
            console.log(`[Reconciler] Loading asset: ${url} for node "${nodeId}"`);

            // Check cache first
            let container = this.assetCache.get(url);

            if (!container) {
                // Load the asset
                const result = await SceneLoader.LoadAssetContainerAsync(
                    '',
                    url,
                    this.scene,
                    undefined,
                    '.glb'
                );
                container = result;
                this.assetCache.set(url, container);
                console.log(`[Reconciler] Asset loaded and cached: ${url}`);
            } else {
                console.log(`[Reconciler] Using cached asset: ${url}`);
            }

            // Replace placeholder with actual meshes
            const instances = container.instantiateModelsToScene(
                (name) => `${nodeId}_${name}`,
                false,
                { doNotInstantiate: false }
            );

            // Set the root as the main node
            if (instances.rootNodes.length > 0) {
                const root = instances.rootNodes[0];
                root.id = nodeId;
                root.name = nodeId;

                // Copy position from placeholder
                if (placeholder.position) {
                    root.position.copyFrom(placeholder.position);
                }

                // Dispose placeholder
                placeholder.dispose();

                // Update nodeMap
                this.nodeMap.set(nodeId, root);

                console.log(`[Reconciler] Asset instantiated for node "${nodeId}"`);
            }

            // Mark loading complete
            this.loadingNodes.delete(nodeId);

        } catch (error) {
            console.error(`[Reconciler] Failed to load asset "${url}" for node "${nodeId}":`, error);

            // Keep placeholder and mark it as error state
            if (placeholder.material) {
                (placeholder.material as StandardMaterial).diffuseColor = new Color3(1, 0, 0);
            }

            this.loadingNodes.delete(nodeId);
        }
    }

    private updatePosition(item: Node, node: SceneNode): void {
        const positionable = item as unknown as { position: Vector3 };
        if (positionable.position) {
            positionable.position.set(node.position[0], node.position[1], node.position[2]);
        }
    }

    private updateMaterial(mesh: AbstractMesh, node: SceneNode, doc: GameDocument): void {
        const matName = `mat_${node.id}`;
        let mat = this.scene.getMaterialByName(matName) as StandardMaterial | null;

        if (!mat) {
            mat = new StandardMaterial(matName, this.scene);
        }

        // Priority 1: Apply texture if specified
        if (node.texture && doc.assets) {
            const textureAsset = doc.assets[node.texture];
            if (textureAsset && textureAsset.type === 'texture') {
                const texture = new BABYLON.Texture(textureAsset.url, this.scene);
                mat.diffuseTexture = texture;
                mat.diffuseColor = Color3.White(); // Use white to show texture properly
                console.log(`[Reconciler] Applied texture "${node.texture}" to mesh "${node.id}"`);
            } else {
                console.warn(`[Reconciler] Texture "${node.texture}" not found in assets`);
            }
        }
        // Priority 2: Fall back to solid color if no texture
        else if (node.color) {
            mat.diffuseTexture = null; // Clear any previous texture
            mat.diffuseColor = Color3.FromHexString(node.color);
        }

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
