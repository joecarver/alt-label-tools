
/**
 * Get an environment variable, trying multiple sources in order:
 * 1. Wrangler's env binding
 * 2. Astro's import.meta.env
 * 3. process.env
 * 4. Default value if provided
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
    // @ts-ignore
    console.log('globalThis', globalThis.__WRANGLER__?.env);
    if (typeof globalThis !== 'undefined') {
        // @ts-ignore - Wrangler adds these bindings at runtime
        const wranglerEnv = globalThis.__WRANGLER__?.env;
        if (wranglerEnv?.[key]) {
            return wranglerEnv[key];
        }
    }

    // Try Wrangler's env binding first
    // @ts-ignore - Wrangler adds these bindings at runtime
    if (typeof env !== 'undefined' && env?.[key]) {
        // @ts-ignore
        console.log('env', env);
        // @ts-ignore
        return env[key];
    }

    // Try Astro's import.meta.env
    console.log('import.meta', import.meta.env);
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
        return import.meta.env[key];
    }

    // Try process.env
    console.log('process.env', process.env);
    if (typeof process !== 'undefined' && process.env?.[key]) {
        return process.env[key];
    }

    // Return default value if provided
    return defaultValue;
} 