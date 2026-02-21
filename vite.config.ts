import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        open: true,
    },
    optimizeDeps: {
        // Babylon.js uses dynamic imports for shaders internally.
        // Excluding it from Vite's pre-bundler prevents the shader 404 errors.
        exclude: ['@babylonjs/core'],
    },
});
