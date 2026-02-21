import { useEffect, useRef, useState } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar, useChatContext } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

import { SceneReconciler } from '../core/reconciler/SceneReconciler';
import { EventBus } from '../core/bus/EventBus';
import { gameDocumentStore } from '../core/state/GameDocumentStore';
import { runtimeState } from '../core/state/RuntimeState';
import { mockGameDoc, type GameDocument } from '../schema/game.schema';

import { useGameContext } from './hooks/useGameContext';
import { useGameActions } from './hooks/useGameActions';
import { PlayStopToggle } from './components/PlayStopToggle';

// ── System prompt for the AI ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a 3D level designer assistant for a game editor called "Build-in-Place".

Use the updateGameDocument tool for ALL scene changes. You have full control over the 3D scene via JSON Patches.

Rules:
- Colors must be CSS hex strings (e.g. "#ff0000" for red, "#0088ff" for blue).
- Positions are [x, y, z] arrays. The ground is at y=0. Place objects above it.
- Size is a single number (uniform scale, default 1). Use this for resizing.
- Primitives: "box", "sphere", "ground".
- Node types: "mesh" for geometry, "light" for lights.
- To ADD a new node, use op:"add" with path "/nodes/-" (appends to the node list).
- To UPDATE a node's property, use op:"replace" with e.g. "/nodes/2/color".
- To REMOVE a node, use op:"remove" with e.g. "/nodes/2".
- Always give new nodes a unique id (e.g. "sphere_2", "blue_box_1").
- Never modify the "floor" (index 0) or "sun" (index 1) nodes unless asked.
- Keep paths simple: /nodes/..., /variables/..., /subscriptions/...

BEHAVIORAL LOGIC (Phase 2):
If the user asks for interaction (e.g., "When I click the box, destroy it and add 1 score"):
1. Patch the targeted mesh to add a \`clickable\` component: 
   \`components: [{ type: "clickable", event: "box.clicked" }]\`
2. Add a new subscription object into the \`/subscriptions/-\` array observing that event:
   \`{ id: "box_rule", on: "box.clicked", actions: [{ type: "destroy_node", target: "$event.node" }, { type: "increment", target: "score", value: 1 }] }\`
3. If they ask to modify a variable (like score), make sure you check if it's already instantiated.`;

// ── Detect CopilotKit availability ────────────────────────────────────────────

const COPILOT_API_KEY = import.meta.env.VITE_COPILOTKIT_PUBLIC_API_KEY as string | undefined;
const COPILOT_RUNTIME_URL = import.meta.env.VITE_COPILOTKIT_RUNTIME_URL as string | undefined;
const HAS_COPILOT = Boolean(COPILOT_API_KEY || COPILOT_RUNTIME_URL);

// ── CopilotKit hooks (only call inside <CopilotKit> provider) ─────────────────

function CopilotHooks() {
    useGameContext();
    useGameActions();
    return null;
}

/**
 * Handles the Cmd+K / Ctrl+K keyboard shortcut to toggle the sidebar.
 * Must be rendered inside a Copilot UI component (like CopilotSidebar)
 * because it requires ChatContextProvider.
 */
function ShortcutToggle() {
    // Note: In v1.51+, useChatContext provides { open, setOpen }
    const { open, setOpen } = useChatContext();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen?.(!open);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, setOpen]);

    return null;
}

// ── Babylon Canvas + HUD ─────────────────────────────────────────────────────

function BabylonViewport() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // 1. Create reconciler + bus
        const reconciler = new SceneReconciler(canvas);
        const bus = new EventBus(reconciler);
        reconciler.bus = bus;

        // 2. Seed store with mock data
        const liveDoc: GameDocument = structuredClone(mockGameDoc);
        gameDocumentStore.getState().setDoc(liveDoc);

        // 3. Initial reconcile
        reconciler.reconcile(liveDoc);
        runtimeState.isPlaying = false; // Editor mode — AI tools enabled

        // 4. Subscribe: store changes → reconcile
        const unsub = gameDocumentStore.subscribe((state) => {
            reconciler.reconcile(state.doc);
        });

        // 5. Score HUD listeners
        const onVarChange = (e: Event) => {
            const { key, value } = (e as CustomEvent<{ key: string; value: number }>).detail;
            if (key === 'score') setScore(value);
        };
        const onReset = () => setScore(0);

        window.addEventListener('runtime:variable_changed', onVarChange);
        window.addEventListener('runtime:reset', onReset);

        // 6. Console helpers
        (window as any).updateAndReconcile = (mutator: (doc: GameDocument) => void) => {
            const doc = structuredClone(gameDocumentStore.getState().doc);
            mutator(doc);
            gameDocumentStore.getState().setDoc(doc);
            console.log('[main] Reconciled.', structuredClone(doc));
        };
        (window as any).liveDoc = liveDoc;
        (window as any).runtimeState = runtimeState;

        const label = HAS_COPILOT
            ? '[Build-in-Place] CopilotKit loaded. Press ⌘K to open AI sidebar.'
            : '[Build-in-Place] Running in standalone mode (no CopilotKit keys). Set VITE_COPILOTKIT_PUBLIC_API_KEY in .env to enable AI.';
        console.log(`%c${label}`, 'color: #7aa2ff; font-weight: bold;');

        return () => {
            unsub();
            window.removeEventListener('runtime:variable_changed', onVarChange);
            reconciler.dispose();
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                id="renderCanvas"
                style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
            />

            {/* HUD overlay */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            >
                {/* ── NEW: Play/Stop Toggle ── */}
                <PlayStopToggle />

                <div
                    style={{
                        position: 'absolute',
                        top: 20,
                        left: 20,
                        fontFamily: "'Segoe UI', system-ui, sans-serif",
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: '#ffd700',
                        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                        letterSpacing: '0.04em',
                    }}
                >
                    Score: {score}
                </div>
                <div
                    style={{
                        position: 'absolute',
                        bottom: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontFamily: "'Segoe UI', system-ui, sans-serif",
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.45)',
                        letterSpacing: '0.05em',
                    }}
                >
                    {HAS_COPILOT
                        ? 'Press ⌘K to open AI sidebar · Click objects to interact'
                        : 'Set VITE_COPILOTKIT_PUBLIC_API_KEY in .env to enable AI sidebar'}
                </div>
            </div>
        </>
    );
}

// ── Top-level App ─────────────────────────────────────────────────────────────

export function EditorApp() {
    const layout = (
        <div
            className="editor-layout"
            style={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                overflow: 'hidden',
                background: '#0d0d1a',
            }}
        >
            <BabylonViewport />
        </div>
    );

    // If no CopilotKit key, render without the provider
    if (!HAS_COPILOT) {
        return layout;
    }

    // Build CopilotKit props
    const copilotProps: Record<string, any> = {};
    if (COPILOT_RUNTIME_URL) {
        copilotProps.runtimeUrl = COPILOT_RUNTIME_URL;
    } else if (COPILOT_API_KEY) {
        copilotProps.publicApiKey = COPILOT_API_KEY;
    }

    return (
        <CopilotKit {...copilotProps}>
            <div
                className="editor-layout"
                style={{
                    width: '100vw',
                    height: '100vh',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#0d0d1a',
                }}
            >
                <CopilotHooks />
                <BabylonViewport />

                <CopilotSidebar
                    instructions={SYSTEM_PROMPT}
                    labels={{
                        title: '🏗️ Build-in-Place',
                        initial: 'What would you like to build? Try "Add a blue sphere at 2, 1, 0"',
                    }}
                    defaultOpen={false}
                    clickOutsideToClose={true}
                >
                    <ShortcutToggle />
                </CopilotSidebar>
            </div>
        </CopilotKit>
    );
}
