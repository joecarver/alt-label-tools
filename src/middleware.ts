import type { APIContext } from 'astro';
import { verifyToken } from './utils/auth';

export async function onRequest(context: APIContext, next: () => Promise<Response>) {
    const url = new URL(context.request.url);

    // Skip auth check for login page and auth endpoints
    if (url.pathname === '/login' || url.pathname.startsWith('/api/auth')) {
        return next();
    }

    const token = context.cookies.get('auth_token')?.value;

    if (!token) {
        return context.redirect('/login');
    }

    try {
        const payload = await verifyToken(token);
        if (!payload) {
            return context.redirect('/login');
        }
        return next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return context.redirect('/login');
    }
} 