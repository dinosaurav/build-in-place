import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        open: true,
    },
    optimizeDeps: {
        // Babylon.js uses dynamic imports for shaders internally.
        // Excluding it from Vite's pre-bundler prevents the shader 404 errors.
        exclude: ['@babylonjs/core'],
    },
});
