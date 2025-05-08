import type { APIRoute } from 'astro';
import { generateAuthUrl, getTokens, verifyToken } from '../../utils/auth';
import { getEnv } from '../../utils/env';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (code) {
        try {
            const tokens = await getTokens(code);
            if (!tokens.access_token) {
                throw new Error('No access token received');
            }

            // Set the token in an HTTP-only cookie
            cookies.set('auth_token', tokens.access_token, {
                path: '/',
                httpOnly: true,
                secure: getEnv('NODE_ENV') === 'production',
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });

            // Redirect to the home page after successful login
            return redirect('/');
        } catch (error) {
            console.error('Error getting tokens:', error);
            return new Response(JSON.stringify({ error: 'Failed to get tokens' }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
    }

    // If no code is provided, generate the auth URL
    const authUrl = generateAuthUrl();
    return new Response(JSON.stringify({ authUrl }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const token = cookies.get('auth_token')?.value;
        if (!token) {
            return new Response(JSON.stringify({ error: 'No token found' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        const payload = await verifyToken(token);
        if (!payload) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        return new Response(JSON.stringify({ user: payload }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        return new Response(JSON.stringify({ error: 'Failed to verify token' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}; 