import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('katex/dist/katex.min.css', () => ({ default: {} }));
vi.mock('@copilotkit/react-ui/styles.css', () => ({ default: {} }));

// Mock matchMedia if needed by UI components
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock Babylon.js Core to prevent WebGL context issues in JSDOM
vi.mock('@babylonjs/core', async () => {
    return {
        Engine: class {
            constructor() { }
            runRenderLoop(cb: () => void) { }
            stopRenderLoop() { }
            resize() { }
            dispose() { }
        },
        Scene: class {
            constructor() { }
            dispose() { }
            getMaterialByName() { return null; }
        },
        Vector3: class {
            constructor(public x: number, public y: number, public z: number) { }
            static Zero() { return new this(0, 0, 0); }
        },
        Color3: class {
            static FromHexString() { return new this(); }
        },
        MeshBuilder: {
            CreateBox: vi.fn(() => ({ position: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } }, scaling: { x: 1, y: 1, z: 1, setAll(v: number) { this.x = v; this.y = v; this.z = v; } }, dispose: vi.fn() })),
            CreateSphere: vi.fn(() => ({ position: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } }, scaling: { x: 1, y: 1, z: 1, setAll(v: number) { this.x = v; this.y = v; this.z = v; } }, dispose: vi.fn() })),
            CreateGround: vi.fn(() => ({ position: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } }, scaling: { x: 1, y: 1, z: 1, setAll(v: number) { this.x = v; this.y = v; this.z = v; } }, dispose: vi.fn() })),
        },
        StandardMaterial: class {
            constructor() { }
            diffuseColor: any = null;
        },
        HemisphericLight: class {
            constructor() { }
            intensity: number = 1;
        },
        ArcRotateCamera: class {
            constructor() { }
            setTarget() { }
            attachControl() { }
        },
        ActionManager: class {
            constructor() { }
            registerAction() { }
        },
        ExecuteCodeAction: class {
            constructor() { }
        }
    };
});
