import { initializeCache } from './utils/NotionApi';
import type { APIContext } from 'astro';
import { verifyToken } from './utils/auth';
import { getSecret } from 'astro:env/server';
export async function onRequest(context: APIContext, next: () => Promise<Response>) {
    // Initialize cache for all requests
    const kv = getSecret("ALT_LABEL_TOOLS_METADATA") as unknown as KVNamespace;
    if (kv) {
        initializeCache(kv);
    }

    // Skip auth check for login page and API endpoints
    const url = new URL(context.request.url);
    if (url.pathname === '/login' || url.pathname.startsWith('/api/')) {
        return next();
    }

    // Check for auth token
    const authToken = context.cookies.get('auth_token');
    if (!authToken) {
        return context.redirect('/login');
    }

    // Verify token and continue
    try {
        const payload = await verifyToken(authToken.value);
        if (!payload) {
            return context.redirect('/login');
        }
        return next();
    } catch (error) {
        console.error('Auth error:', error);
        return context.redirect('/login');
    }
} 