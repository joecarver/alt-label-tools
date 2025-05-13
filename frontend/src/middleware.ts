import { initializeCache } from './utils/NotionApi/api';
import type { APIContext } from 'astro';
import { verifyToken } from './utils/auth';
import { MemoryKV } from './utils/memoryCache';

export async function onRequest(context: APIContext, next: () => Promise<Response>) {
    // Try to get KV from runtime env, fallback to in-memory cache
    const kv = context.locals.runtime?.env?.ALT_LABEL_TOOLS_METADATA
        ? context.locals.runtime.env.ALT_LABEL_TOOLS_METADATA as unknown as KVNamespace
        : new MemoryKV();

    initializeCache(kv);

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