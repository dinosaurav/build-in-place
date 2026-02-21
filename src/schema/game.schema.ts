/**
 * game.schema.ts — Phase 1 schema.
 *
 * Adds Components, Actions, Subscriptions, and per-scene Variables
 * on top of the Phase 0 base types.
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

export type Action = IncrementAction | DestroyNodeAction;

// ── Subscriptions ────────────────────────────────────────────────────────────

export interface Subscription {
    id: string;
    on: string;           // Event name to listen for
    when?: string;        // Optional condition expression (future use)
    actions: Action[];
}

// ── Node Types ───────────────────────────────────────────────────────────────

export interface SceneNode {
    id: string;
    type: 'mesh' | 'light';
    primitive?: 'box' | 'sphere' | 'ground';
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
}

// ── Phase 1 Mock Data ────────────────────────────────────────────────────────

export const mockGameDoc: GameDocument = {
    activeScene: 'level_1',
    scenes: {
        level_1: {
            variables: { score: 0 },
            nodes: [
                { id: 'sun', type: 'light', position: [5, 10, 5], intensity: 0.8 },
                { id: 'floor', type: 'mesh', primitive: 'ground', position: [0, 0, 0], color: '#444444' },
                // The collectible coin — clicking it fires "coin.clicked"
                {
                    id: 'coin_1',
                    type: 'mesh',
                    primitive: 'sphere',
                    position: [0, 0.7, 0],
                    color: '#ffd700',
                    components: [{ type: 'clickable', event: 'coin.clicked' }],
                },
                // Extra cube for bulk-edit testing
                {
                    id: 'box_1',
                    type: 'mesh',
                    primitive: 'box',
                    position: [-2, 0.5, 0],
                    color: '#ff4444',
                    size: 1,
                },
            ],
            subscriptions: [
                {
                    id: 'collect_coin',
                    on: 'coin.clicked',
                    actions: [
                        { type: 'increment', target: 'score', value: 1 },
                        { type: 'destroy_node', target: '$event.node' },
                    ],
                },
            ],
        },
    },
};
