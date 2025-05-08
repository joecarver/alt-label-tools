/**
 * Get an environment variable with fallback options
 * @param key The environment variable key
 * @param defaultValue Optional default value if the variable is not found
 * @returns The environment variable value or the default value
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
    // First try Astro's import.meta.env
    const astroValue = import.meta.env[key];
    if (astroValue !== undefined) {
        return astroValue;
    }

    // Then try process.env (for Cloudflare Workers)
    const processValue = process.env[key];
    if (processValue !== undefined) {
        return processValue;
    }

    // Finally, return the default value if provided
    return defaultValue;
} 