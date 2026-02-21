/**
 * SceneTreePanel.tsx
 *
 * Displays the complete game document hierarchy across all scenes.
 * Shows:
 * - All scenes in the game
 * - Current active scene (highlighted)
 * - Node hierarchy within each scene
 * - Quick navigation between scenes
 */

import { useState } from 'react';
import { useGameStore } from '../../core/state/GameDocumentStore';

export function SceneTreePanel() {
    const doc = useGameStore((s) => s.doc);
    const patchDoc = useGameStore((s) => s.patchDoc);
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedScenes, setExpandedScenes] = useState<Set<string>>(
        new Set([doc.activeScene])
    );

    if (!doc) return null;

    const toggleSceneExpansion = (sceneId: string) => {
        const newExpanded = new Set(expandedScenes);
        if (newExpanded.has(sceneId)) {
            newExpanded.delete(sceneId);
        } else {
            newExpanded.add(sceneId);
        }
        setExpandedScenes(newExpanded);
    };

    const switchToScene = (sceneId: string) => {
        if (sceneId !== doc.activeScene) {
            patchDoc((draft) => {
                draft.activeScene = sceneId;
            });
        }
    };

    const sceneEntries = Object.entries(doc.scenes || {});

    return (
        <div
            style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: isExpanded ? 280 : 40,
                maxHeight: '80vh',
                background: 'rgba(20, 20, 35, 0.95)',
                border: '1px solid rgba(100, 140, 255, 0.3)',
                borderRadius: 8,
                fontFamily: 'system-ui, sans-serif',
                fontSize: '13px',
                color: '#d0d0e0',
                overflow: 'hidden',
                transition: 'width 0.2s ease',
                pointerEvents: 'auto',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '10px 12px',
                    background: 'rgba(60, 80, 140, 0.3)',
                    borderBottom: '1px solid rgba(100, 140, 255, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span style={{ fontWeight: 600, fontSize: '14px' }}>
                    {isExpanded ? '📋 Scene Tree' : '📋'}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>
                    {isExpanded ? (sceneEntries.length > 0 ? '▼' : '') : '◀'}
                </span>
            </div>

            {/* Content */}
            {isExpanded && (
                <div
                    style={{
                        padding: '8px 0',
                        maxHeight: 'calc(80vh - 50px)',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    }}
                >
                    {sceneEntries.length === 0 ? (
                        <div style={{ padding: '12px', opacity: 0.5, textAlign: 'center' }}>
                            No scenes
                        </div>
                    ) : (
                        sceneEntries.map(([sceneId, sceneData]) => {
                            const isActive = sceneId === doc.activeScene;
                            const isSceneExpanded = expandedScenes.has(sceneId);

                            return (
                                <div key={sceneId} style={{ marginBottom: 4 }}>
                                    {/* Scene Header */}
                                    <div
                                        style={{
                                            padding: '6px 12px',
                                            background: isActive
                                                ? 'rgba(100, 140, 255, 0.25)'
                                                : 'transparent',
                                            borderLeft: isActive
                                                ? '3px solid #7aa2ff'
                                                : '3px solid transparent',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background =
                                                    'rgba(100, 140, 255, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                        onClick={() => switchToScene(sceneId)}
                                    >
                                        <span
                                            style={{
                                                fontWeight: isActive ? 600 : 400,
                                                color: isActive ? '#b5d4ff' : '#d0d0e0',
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {isActive && '▶ '}
                                            {sceneId}
                                        </span>
                                        <button
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#b0b0c0',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                padding: '2px 6px',
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSceneExpansion(sceneId);
                                            }}
                                        >
                                            {isSceneExpanded ? '▼' : '▶'}
                                        </button>
                                    </div>

                                    {/* Scene Content */}
                                    {isSceneExpanded && (
                                        <div
                                            style={{
                                                paddingLeft: 20,
                                                paddingTop: 4,
                                                paddingBottom: 4,
                                            }}
                                        >
                                            {/* Variables */}
                                            {sceneData.variables &&
                                                Object.keys(sceneData.variables).length > 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            opacity: 0.7,
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        📊 Variables:{' '}
                                                        {Object.keys(sceneData.variables).join(', ')}
                                                    </div>
                                                )}

                                            {/* Nodes */}
                                            {sceneData.nodes.length > 0 ? (
                                                <>
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            opacity: 0.6,
                                                            marginBottom: 2,
                                                        }}
                                                    >
                                                        Nodes ({sceneData.nodes.length}):
                                                    </div>
                                                    {sceneData.nodes.map((node) => (
                                                        <div
                                                            key={node.id}
                                                            style={{
                                                                padding: '3px 8px',
                                                                fontSize: '11px',
                                                                color: '#b0b0c0',
                                                                borderLeft:
                                                                    '1px solid rgba(255,255,255,0.1)',
                                                                marginLeft: 8,
                                                                marginBottom: 2,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    color:
                                                                        node.type === 'light'
                                                                            ? '#ffdd88'
                                                                            : '#88ddff',
                                                                }}
                                                            >
                                                                {node.type === 'light' ? '💡' : '🔲'}
                                                            </span>{' '}
                                                            {node.id}
                                                            {node.asset && (
                                                                <span
                                                                    style={{
                                                                        marginLeft: 4,
                                                                        opacity: 0.6,
                                                                    }}
                                                                >
                                                                    [asset: {node.asset}]
                                                                </span>
                                                            )}
                                                            {node.primitive && (
                                                                <span
                                                                    style={{
                                                                        marginLeft: 4,
                                                                        opacity: 0.6,
                                                                    }}
                                                                >
                                                                    [{node.primitive}]
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <div
                                                    style={{
                                                        fontSize: '11px',
                                                        opacity: 0.5,
                                                        fontStyle: 'italic',
                                                    }}
                                                >
                                                    No nodes
                                                </div>
                                            )}

                                            {/* Subscriptions */}
                                            {sceneData.subscriptions &&
                                                sceneData.subscriptions.length > 0 && (
                                                    <div
                                                        style={{
                                                            fontSize: '11px',
                                                            opacity: 0.7,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        ⚡ {sceneData.subscriptions.length}{' '}
                                                        subscription(s)
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {/* Asset Manifest Summary */}
                    {doc.assets && Object.keys(doc.assets).length > 0 && (
                        <div
                            style={{
                                marginTop: 12,
                                paddingTop: 8,
                                borderTop: '1px solid rgba(100, 140, 255, 0.2)',
                            }}
                        >
                            <div
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    opacity: 0.8,
                                }}
                            >
                                🎨 Assets ({Object.keys(doc.assets).length})
                            </div>
                            {Object.entries(doc.assets).map(([key, asset]) => (
                                <div
                                    key={key}
                                    style={{
                                        padding: '3px 20px',
                                        fontSize: '11px',
                                        color: '#b0b0c0',
                                    }}
                                >
                                    {asset.type === 'glb' ? '📦' : '🖼️'} {key}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
