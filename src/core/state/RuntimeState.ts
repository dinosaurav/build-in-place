/**
 * RuntimeState.ts
 *
 * Ephemeral, play-mode-only state. Nothing here is persisted to game.json.
 * Shared as a singleton so the EventBus and SceneReconciler read from the
 * same instance.
 *
 * Contains:
 *  - isPlaying        — whether the game loop is active
 *  - variables        — named numeric counters (score, lives, etc.)
 *  - destroyedNodes   — node IDs that have been removed during play
 *  - dynamicNodes     — nodes spawned at runtime (Phase 2+)
 */

export class RuntimeState {
    isPlaying = false;

    private variables = new Map<string, number>();
    readonly destroyedNodes = new Set<string>();

    // ── Variables ─────────────────────────────────────────────────────────

    /** Seed initial variable values from the scene definition. */
    initVariables(vars: Record<string, number>): void {
        for (const [k, v] of Object.entries(vars)) {
            // Don't overwrite — allows hot-reload without losing live state
            if (!this.variables.has(k)) {
                this.variables.set(k, v);
            }
        }
    }

    getVariable(key: string): number {
        return this.variables.get(key) ?? 0;
    }

    setVariable(key: string, value: number): void {
        if (this.variables.get(key) === value) return; // Only dispatch if changed

        this.variables.set(key, value);
        // Emit a DOM event so any UI layer can react without tight coupling
        window.dispatchEvent(
            new CustomEvent('runtime:variable_changed', {
                detail: { key, value },
            }),
        );
    }

    getAllVariables(): Record<string, number> {
        return Object.fromEntries(this.variables);
    }

    // ── Destroyed Nodes ───────────────────────────────────────────────────

    markDestroyed(nodeId: string): void {
        this.destroyedNodes.add(nodeId);
    }

    isDestroyed(nodeId: string): boolean {
        return this.destroyedNodes.has(nodeId);
    }

    // ── Reset (for "stop playing") ────────────────────────────────────────

    reset(): void {
        this.isPlaying = false;
        this.variables.clear();
        this.destroyedNodes.clear();

        window.dispatchEvent(new CustomEvent('runtime:reset'));
    }
}

/** Shared singleton — import this everywhere instead of `new RuntimeState()`. */
export const runtimeState = new RuntimeState();
