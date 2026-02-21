/**
 * ErrorBoundary.tsx
 *
 * React error boundary component for graceful error handling.
 * Catches errors in child components and displays a fallback UI.
 */

import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    /** Optional name for better error logging */
    name?: string;
    /** If true, show minimal inline error instead of full overlay */
    inline?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: { componentStack: string } | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
        const boundaryName = this.props.name || 'ErrorBoundary';
        console.error(`[${boundaryName}] Caught error:`, error);
        console.error(`[${boundaryName}] Component stack:`, errorInfo.componentStack);

        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Inline error (minimal)
            if (this.props.inline) {
                return (
                    <div
                        style={{
                            padding: '12px',
                            background: 'rgba(255, 50, 50, 0.1)',
                            border: '1px solid rgba(255, 100, 100, 0.3)',
                            borderRadius: '6px',
                            color: '#ff9999',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                        }}
                    >
                        ⚠️ Component error: {this.state.error?.message}
                        <button
                            onClick={this.handleReset}
                            style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '4px',
                                color: '#ffaaaa',
                                cursor: 'pointer',
                                fontSize: '11px',
                            }}
                        >
                            Retry
                        </button>
                    </div>
                );
            }

            // Full error overlay (default)
            return (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(10, 10, 20, 0.95)',
                        zIndex: 9999,
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '600px',
                            padding: '32px',
                            background: 'rgba(30, 30, 50, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 100, 100, 0.3)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '48px',
                                marginBottom: '16px',
                                textAlign: 'center',
                            }}
                        >
                            ⚠️
                        </div>
                        <h2
                            style={{
                                margin: '0 0 16px 0',
                                fontSize: '24px',
                                fontWeight: 600,
                                color: '#ff9999',
                                textAlign: 'center',
                            }}
                        >
                            {this.props.name ? `${this.props.name} Error` : 'Something went wrong'}
                        </h2>
                        <div
                            style={{
                                marginBottom: '24px',
                                padding: '16px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 100, 100, 0.2)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '12px',
                                    color: '#aaa',
                                    marginBottom: '8px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                Error Message
                            </div>
                            <div
                                style={{
                                    fontSize: '14px',
                                    color: '#ffcccc',
                                    fontFamily: 'monospace',
                                    lineHeight: '1.5',
                                }}
                            >
                                {this.state.error?.message || 'Unknown error'}
                            </div>
                        </div>

                        {this.state.errorInfo && (
                            <details
                                style={{
                                    marginBottom: '24px',
                                    fontSize: '12px',
                                    color: '#999',
                                }}
                            >
                                <summary
                                    style={{
                                        cursor: 'pointer',
                                        padding: '8px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '4px',
                                        marginBottom: '8px',
                                    }}
                                >
                                    View Component Stack
                                </summary>
                                <pre
                                    style={{
                                        margin: 0,
                                        padding: '12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        overflow: 'auto',
                                        maxHeight: '200px',
                                        color: '#ccc',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '12px 24px',
                                    background: '#7aa2ff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#5a82df';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#7aa2ff';
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '12px 24px',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px',
                                    color: '#ddd',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Reload Page
                            </button>
                        </div>

                        <div
                            style={{
                                marginTop: '24px',
                                padding: '12px',
                                background: 'rgba(100, 140, 255, 0.1)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#aaa',
                                textAlign: 'center',
                            }}
                        >
                            💡 Tip: Check the browser console for more details
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
