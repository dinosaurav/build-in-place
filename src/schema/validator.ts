/**
 * validator.ts
 *
 * Zod schemas for runtime validation of GameDocument and JSON Patch operations.
 * Ensures AI-generated patches produce valid game state.
 */

import { z } from 'zod';
import type { Operation } from 'fast-json-patch';
import { applyPatch as applyJsonPatch } from 'fast-json-patch';
import type { GameDocument } from './game.schema';

// ── Component Schemas ────────────────────────────────────────────────────────

const ClickableComponentSchema = z.object({
    type: z.literal('clickable'),
    event: z.string().min(1),
});

const RotateComponentSchema = z.object({
    type: z.literal('rotate'),
    axis: z.enum(['x', 'y', 'z']),
    speed: z.number(),
});

const KeybindComponentSchema = z.object({
    type: z.literal('keybind'),
    key: z.string().min(1),
    event: z.string().min(1),
});

const CollectibleComponentSchema = z.object({
    type: z.literal('collectible'),
    event: z.string().min(1),
});

const ComponentSchema = z.discriminatedUnion('type', [
    ClickableComponentSchema,
    RotateComponentSchema,
    KeybindComponentSchema,
    CollectibleComponentSchema,
]);

// ── Action Schemas ───────────────────────────────────────────────────────────

const IncrementActionSchema = z.object({
    type: z.literal('increment'),
    target: z.string().min(1),
    value: z.number(),
});

const DestroyNodeActionSchema = z.object({
    type: z.literal('destroy_node'),
    target: z.string().min(1),
});

const TransitionSceneActionSchema = z.object({
    type: z.literal('transition_scene'),
    to: z.string().min(1),
    persistVars: z.array(z.string()).optional(),
});

const ActionSchema = z.discriminatedUnion('type', [
    IncrementActionSchema,
    DestroyNodeActionSchema,
    TransitionSceneActionSchema,
]);

// ── Subscription Schema ──────────────────────────────────────────────────────

const SubscriptionSchema = z.object({
    id: z.string().min(1),
    on: z.string().min(1),
    when: z.string().optional(),
    actions: z.array(ActionSchema),
});

// ── Asset Schema ─────────────────────────────────────────────────────────────

const AssetDefinitionSchema = z.object({
    type: z.enum(['glb', 'texture']),
    url: z.string().url(),
    metadata: z
        .object({
            name: z.string().optional(),
            description: z.string().optional(),
        })
        .catchall(z.any())
        .optional(),
});

// ── Scene Node Schema ────────────────────────────────────────────────────────

const SceneNodeSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['mesh', 'light']),
    primitive: z.enum(['box', 'sphere', 'ground']).optional(),
    asset: z.string().optional(),
    position: z.tuple([z.number(), z.number(), z.number()]),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    size: z.number().positive().optional(),
    intensity: z.number().min(0).max(10).optional(),
    components: z.array(ComponentSchema).optional(),
});

// ── Scene Data Schema ────────────────────────────────────────────────────────

const SceneDataSchema = z.object({
    variables: z.record(z.string(), z.number()).optional(),
    nodes: z.array(SceneNodeSchema),
    subscriptions: z.array(SubscriptionSchema).optional(),
});

// ── Game Document Schema ─────────────────────────────────────────────────────

export const GameDocumentSchema = z.object({
    activeScene: z.string().min(1),
    scenes: z.record(z.string(), SceneDataSchema),
    assets: z.record(z.string(), AssetDefinitionSchema).optional(),
});

// ── Validation Helper ────────────────────────────────────────────────────────

export interface ValidationResult {
    success: boolean;
    data?: GameDocument;
    error?: string;
}

/**
 * Validates a GameDocument after applying patches.
 *
 * @param doc - The current document
 * @param patches - Array of JSON Patch operations to apply
 * @returns ValidationResult with success status and either validated data or error message
 */
export function validatePatches(
    doc: GameDocument,
    patches: Operation[]
): ValidationResult {
    // Step 1: Clone the document to avoid mutating the original
    const clonedDoc = structuredClone(doc);

    // Step 2: Apply patches to the clone
    try {
        applyJsonPatch(clonedDoc, patches);
    } catch (patchError) {
        return {
            success: false,
            error: `Patch application failed: ${
                patchError instanceof Error ? patchError.message : String(patchError)
            }`,
        };
    }

    // Step 3: Validate the resulting document with Zod
    const result = GameDocumentSchema.safeParse(clonedDoc);

    if (!result.success) {
        // Format Zod errors into a readable string for the AI
        const errorMessages = result.error.errors
            .map((err) => {
                const path = err.path.join('.');
                return `- ${path}: ${err.message}`;
            })
            .join('\n');

        return {
            success: false,
            error: `Validation failed:\n${errorMessages}\n\nThe patches would create an invalid game state. Please check:\n- Node IDs are unique and non-empty\n- Colors are valid hex strings (e.g., "#ff0000")\n- Positions are [x, y, z] number arrays\n- Scene references exist in the scenes object\n- All required fields are present`,
        };
    }

    // Step 4: Return the validated document
    return {
        success: true,
        data: result.data as GameDocument,
    };
}

/**
 * Format validation errors for AI consumption.
 * Returns a concise error message that helps the AI self-correct.
 */
export function formatValidationError(error: z.ZodError): string {
    const issues = error.errors.map((err) => {
        const path = err.path.length > 0 ? err.path.join('.') : 'root';
        return `  • ${path}: ${err.message}`;
    });

    return [
        'Schema validation failed. The following issues were found:',
        ...issues,
        '',
        'Please fix these issues and try again.',
    ].join('\n');
}
