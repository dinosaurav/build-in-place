/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** CopilotKit Cloud public API key */
    readonly VITE_COPILOTKIT_PUBLIC_API_KEY?: string;
    /** Self-hosted CopilotKit runtime URL (e.g. http://localhost:3001/api/copilotkit) */
    readonly VITE_COPILOTKIT_RUNTIME_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
