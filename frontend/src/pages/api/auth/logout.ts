import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
    // Clear the auth token cookie
    cookies.delete('auth_token', {
        path: '/',
    });

    // Redirect to login page
    return redirect('/login');
}; 