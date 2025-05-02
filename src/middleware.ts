import type { APIContext } from 'astro';
import { verifyToken } from './utils/auth';

export async function onRequest({ request, cookies, redirect }: APIContext) {
    const url = new URL(request.url);

    // Skip auth check for login page and auth endpoints
    if (url.pathname === '/login' || url.pathname.startsWith('/api/auth')) {
        return;
    }

    const token = cookies.get('auth_token')?.value;

    if (!token) {
        return redirect('/login');
    }

    try {
        const payload = await verifyToken(token);
        if (!payload) {
            return redirect('/login');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        return redirect('/login');
    }
} 