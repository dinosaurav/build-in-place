import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { textureSaverPlugin } from './vite-plugin-texture-saver';

export default defineConfig({
    plugins: [react(), textureSaverPlugin()],
    server: {
        open: true,
    },
    optimizeDeps: {
        // Babylon.js uses dynamic imports for shaders internally.
        // Excluding it from Vite's pre-bundler prevents the shader 404 errors.
        exclude: ['@babylonjs/core'],
    },
});
