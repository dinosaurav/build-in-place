import { useEffect, useState } from 'react';
import { runtimeState } from '../../core/state/RuntimeState';
import { gameDocumentStore } from '../../core/state/GameDocumentStore';

/**
 * PlayStopToggle
 *
 * Floating toggle to switch between "Edit Mode" (stopped) and "Play Mode" (running).
 * Syncs with the `runtimeState.isPlaying` singleton cleanly.
 */
export function PlayStopToggle() {
    const [isPlaying, setIsPlaying] = useState(runtimeState.isPlaying);

    // Forces a re-render if the runtimeState changes externally
    useEffect(() => {
        const interval = setInterval(() => {
            if (runtimeState.isPlaying !== isPlaying) {
                setIsPlaying(runtimeState.isPlaying);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [isPlaying]);

    const handleToggle = () => {
        const nextState = !isPlaying;
        setIsPlaying(nextState);
        runtimeState.isPlaying = nextState;

        if (nextState) {
            // Play -> Initialize tracking variables
            const doc = gameDocumentStore.getState().doc;
            const sceneData = doc.scenes[doc.activeScene];
            if (sceneData?.variables) {
                runtimeState.initVariables(sceneData.variables);
            }
            console.log('[Runtime] ▶ Play Mode active. Variables mounted.');
        } else {
            // Stop -> Reset live ephemeral state completely, and force meshes to reappear
            runtimeState.reset();
            console.log('[Runtime] ■ Stop Mode active. Live state wiped.');

            // Re-apply the authoritative JSON document to restore any destroyed nodes
            const doc = gameDocumentStore.getState().doc;
            gameDocumentStore.getState().setDoc(structuredClone(doc));
        }
    };

    return (
        <button
            onClick={handleToggle}
            style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)', // Centered alignment
                padding: '10px 24px',
                background: isPlaying ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)', // Red / Green
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                transition: 'background 0.2s',
                zIndex: 100, // Stay above Babylon canvas
                pointerEvents: 'auto',
            }}
        >
            {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
    );
}
