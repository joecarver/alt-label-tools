// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
    integrations: [react()],
    output: "server",
    adapter: cloudflare({
        sessionKVBindingName: 'ALT_LABEL_TOOLS_SESSION',
    }),
    experimental: {
        session: true,
    },
    vite: {
        resolve: {
            alias: import.meta.env.PROD ? {
                "react-dom/server": "react-dom/server.edge",
            } : {},
        },
        ssr: {
            external: [
                'events',
                'child_process',
                'fs',
                'os',
                'path',
                'querystring',
                'stream',
                'https',
                'url',
                'util',
                'crypto',
                'net',
                'tls',
                'assert',
                'buffer',
                'http',
                'http2',
                'zlib',
                'process'
            ]
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks: {
                        'googleapis': ['googleapis'],
                        'react-vendor': ['react', 'react-dom'],
                        'radix': ['@radix-ui/themes', '@radix-ui/react-icons'],
                    }
                }
            }
        }
    }
});