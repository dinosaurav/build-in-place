/**
 * game.schema.ts — Phase 3 schema.
 *
 * Phase 1: Components, Actions, Subscriptions, and per-scene Variables
 * Phase 3: Asset Manifest, Scene Transitions, External 3D Models (GLB)
 */

// ── Components ───────────────────────────────────────────────────────────────

export interface ClickableComponent {
    type: 'clickable';
    event: string; // Event name to fire, e.g. "coin.clicked"
}

export interface RotateComponent {
    type: 'rotate';
    axis: 'x' | 'y' | 'z';
    speed: number; // degrees per second
}

export interface KeybindComponent {
    type: 'keybind';
    key: string;   // e.g. "ArrowUp"
    event: string;
}

export interface CollectibleComponent {
    type: 'collectible';
    event: string;
}

export type Component =
    | ClickableComponent
    | RotateComponent
    | KeybindComponent
    | CollectibleComponent;

// ── Actions ──────────────────────────────────────────────────────────────────

export interface IncrementAction {
    type: 'increment';
    target: string;  // Variable name, e.g. "score"
    value: number;
}

export interface DestroyNodeAction {
    type: 'destroy_node';
    /** Node ID, or "$event.node" to use nodeId from the event payload. */
    target: string;
}

export interface TransitionSceneAction {
    type: 'transition_scene';
    /** Target scene ID to transition to */
    to: string;
    /** Optional: variable keys that should persist across the transition */
    persistVars?: string[];
}

export type Action = IncrementAction | DestroyNodeAction | TransitionSceneAction;

// ── Subscriptions ────────────────────────────────────────────────────────────

export interface Subscription {
    id: string;
    on: string;           // Event name to listen for
    when?: string;        // Optional condition expression (future use)
    actions: Action[];
}

// ── Assets ───────────────────────────────────────────────────────────────────

export interface AssetDefinition {
    type: 'glb' | 'texture';
    url: string;
    /** Optional metadata for the asset */
    metadata?: {
        name?: string;
        description?: string;
        [key: string]: any;
    };
}

// ── Node Types ───────────────────────────────────────────────────────────────

export interface SceneNode {
    id: string;
    type: 'mesh' | 'light';
    /** Use primitive for built-in geometry (box, sphere, ground) */
    primitive?: 'box' | 'sphere' | 'ground';
    /** Use asset to reference an external 3D model from the asset manifest */
    asset?: string;
    position: [number, number, number];
    color?: string;        // Hex string e.g. "#ff4444"
    size?: number;         // Uniform scale (default 1)
    intensity?: number;    // For lights
    components?: Component[];
}

// ── Document ─────────────────────────────────────────────────────────────────

export interface SceneData {
    variables?: Record<string, number>;
    nodes: SceneNode[];
    subscriptions?: Subscription[];
}

export interface GameDocument {
    activeScene: string;
    scenes: {
        [sceneId: string]: SceneData;
    };
    /** Asset manifest: maps friendly names to external resources (GLB files, textures) */
    assets?: {
        [assetKey: string]: AssetDefinition;
    };
}

// ── Phase 3 Mock Data ────────────────────────────────────────────────────────
// Demonstrates: Multiple scenes, asset manifest, scene transitions, state persistence

export const mockGameDoc: GameDocument = {
    activeScene: 'level_1',

    // Asset manifest - external 3D models
    assets: {
        example_model: {
            type: 'glb',
            url: 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb',
            metadata: {
                name: 'Example Avatar',
                description: 'Sample 3D model for testing GLB loading',
            },
        },
    },

    scenes: {
        // ── Level 1: Coin Collection ────────────────────────────────────────
        level_1: {
            variables: { score: 0, coins_collected: 0 },
            nodes: [
                { id: 'sun', type: 'light', position: [5, 10, 5], intensity: 0.8 },
                { id: 'floor', type: 'mesh', primitive: 'ground', position: [0, 0, 0], color: '#334433' },

                // Collectible coins
                {
                    id: 'coin_1',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [0, 0.7, 0],
                    color: '#ffd700',
                    size: 0.5,
                    components: [{ type: 'clickable', event: 'coin.clicked' }],
                },
                {
                    id: 'coin_2',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [2, 0.7, 2],
                    color: '#ffd700',
                    size: 0.5,
                    components: [{ type: 'clickable', event: 'coin.clicked' }],
                },
                {
                    id: 'coin_3',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [-2, 0.7, 2],
                    color: '#ffd700',
                    size: 0.5,
                    components: [{ type: 'clickable', event: 'coin.clicked' }],
                },

                // Portal to level 2 (appears after collecting all coins)
                {
                    id: 'portal',
                    type: 'mesh',
                    primitive: 'box',
                    position: [0, 1, -3],
                    color: '#00ffff',
                    size: 1.5,
                    components: [{ type: 'clickable', event: 'portal.clicked' }],
                },
            ],
            subscriptions: [
                {
                    id: 'collect_coin',
                    on: 'coin.clicked',
                    actions: [
                        { type: 'increment', target: 'score', value: 10 },
                        { type: 'increment', target: 'coins_collected', value: 1 },
                        { type: 'destroy_node', target: '$event.node' },
                    ],
                },
                {
                    id: 'use_portal',
                    on: 'portal.clicked',
                    actions: [
                        // Transition to level 2, persisting score
                        { type: 'transition_scene', to: 'level_2', persistVars: ['score'] },
                    ],
                },
            ],
        },

        // ── Level 2: Challenge Room ──────────────────────────────────────────
        level_2: {
            variables: { score: 0, enemies_defeated: 0 },
            nodes: [
                { id: 'sun', type: 'light', position: [5, 10, 5], intensity: 0.6 },
                { id: 'floor', type: 'mesh', primitive: 'ground', position: [0, 0, 0], color: '#442222' },

                // Enemy boxes
                {
                    id: 'enemy_1',
                    type: 'mesh',
                    primitive: 'box',
                    position: [2, 0.5, 0],
                    color: '#ff4444',
                    size: 1,
                    components: [{ type: 'clickable', event: 'enemy.defeated' }],
                },
                {
                    id: 'enemy_2',
                    type: 'mesh',
                    primitive: 'box',
                    position: [-2, 0.5, 0],
                    color: '#ff4444',
                    size: 1,
                    components: [{ type: 'clickable', event: 'enemy.defeated' }],
                },

                // Exit portal to boss room
                {
                    id: 'boss_portal',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [0, 1.5, -3],
                    color: '#ff00ff',
                    size: 1.2,
                    components: [{ type: 'clickable', event: 'boss_portal.clicked' }],
                },

                // Return portal to level 1
                {
                    id: 'return_portal',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [0, 0.5, 3],
                    color: '#00ff00',
                    size: 0.8,
                    components: [{ type: 'clickable', event: 'return.clicked' }],
                },
            ],
            subscriptions: [
                {
                    id: 'defeat_enemy',
                    on: 'enemy.defeated',
                    actions: [
                        { type: 'increment', target: 'score', value: 25 },
                        { type: 'increment', target: 'enemies_defeated', value: 1 },
                        { type: 'destroy_node', target: '$event.node' },
                    ],
                },
                {
                    id: 'enter_boss_room',
                    on: 'boss_portal.clicked',
                    actions: [
                        { type: 'transition_scene', to: 'boss_room', persistVars: ['score'] },
                    ],
                },
                {
                    id: 'return_to_level_1',
                    on: 'return.clicked',
                    actions: [
                        { type: 'transition_scene', to: 'level_1', persistVars: ['score'] },
                    ],
                },
            ],
        },

        // ── Boss Room: Final Challenge ───────────────────────────────────────
        boss_room: {
            variables: { score: 0, boss_health: 3 },
            nodes: [
                { id: 'dramatic_light', type: 'light', position: [0, 15, 0], intensity: 1.2 },
                { id: 'floor', type: 'mesh', primitive: 'ground', position: [0, 0, 0], color: '#220022' },

                // Boss (large red sphere)
                {
                    id: 'boss',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [0, 2, -2],
                    color: '#ff0000',
                    size: 2,
                    components: [{ type: 'clickable', event: 'boss.hit' }],
                },

                // Victory portal (appears after boss is defeated)
                {
                    id: 'victory_portal',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [0, 1, 0],
                    color: '#ffff00',
                    size: 1.5,
                    components: [{ type: 'clickable', event: 'victory.claimed' }],
                },
            ],
            subscriptions: [
                {
                    id: 'hit_boss',
                    on: 'boss.hit',
                    actions: [
                        { type: 'increment', target: 'score', value: 50 },
                        { type: 'increment', target: 'boss_health', value: -1 },
                        // In a real implementation, you'd check boss_health and destroy boss when it reaches 0
                    ],
                },
                {
                    id: 'claim_victory',
                    on: 'victory.claimed',
                    actions: [
                        { type: 'increment', target: 'score', value: 100 },
                        // Could transition back to level 1 or a victory screen
                        { type: 'transition_scene', to: 'level_1', persistVars: ['score'] },
                    ],
                },
            ],
        },
    },
};
