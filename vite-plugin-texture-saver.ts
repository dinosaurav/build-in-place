/**
 * vite-plugin-texture-saver.ts
 *
 * Vite plugin that adds a /api/save-texture endpoint for persisting
 * NanoBanana-generated textures to disk during development.
 */

import type { Plugin } from 'vite';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export function textureSaverPlugin(): Plugin {
    return {
        name: 'texture-saver',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url === '/api/save-texture' && req.method === 'POST') {
                    let body = '';

                    req.on('data', (chunk) => {
                        body += chunk.toString();
                    });

                    req.on('end', async () => {
                        try {
                            const { filename, base64Data } = JSON.parse(body);

                            if (!filename || !base64Data) {
                                res.statusCode = 400;
                                res.end(JSON.stringify({ error: 'Missing filename or base64Data' }));
                                return;
                            }

                            // Ensure /public/textures directory exists
                            const texturesDir = join(process.cwd(), 'public', 'textures');
                            if (!existsSync(texturesDir)) {
                                await mkdir(texturesDir, { recursive: true });
                            }

                            // Convert base64 to buffer
                            const buffer = Buffer.from(base64Data, 'base64');

                            // Save file
                            const filePath = join(texturesDir, filename);
                            await writeFile(filePath, buffer);

                            console.log(`[TextureSaver] ✅ Saved texture: ${filename}`);

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(
                                JSON.stringify({
                                    success: true,
                                    url: `/textures/${filename}`,
                                    path: filePath,
                                })
                            );
                        } catch (error) {
                            console.error('[TextureSaver] Failed to save texture:', error);
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: String(error) }));
                        }
                    });
                } else {
                    next();
                }
            });
        },
    };
}
