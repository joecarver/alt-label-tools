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
});