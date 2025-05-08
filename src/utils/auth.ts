// List of allowed email addresses
const ALLOWED_EMAILS = [
    'joe.crvr1@gmail.com',
    'altlabeltools@gmail.com'
];

// Get the base URL for the current environment
const getBaseUrl = () => {
    if (import.meta.env.NODE_ENV === 'production') {
        return import.meta.env.PRODUCTION_URL || 'https://your-production-url.com';
    }
    return 'http://localhost:4321';
};

// Scopes required for user authentication
const USER_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

export function generateAuthUrl(): string {
    const params = new URLSearchParams({
        client_id: import.meta.env.GOOGLE_CLIENT_ID,
        redirect_uri: `${getBaseUrl()}/api/auth`,
        response_type: 'code',
        scope: USER_SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getTokens(code: string) {
    const params = new URLSearchParams({
        code,
        client_id: import.meta.env.GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${getBaseUrl()}/api/auth`,
        grant_type: 'authorization_code'
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!response.ok) {
        throw new Error('Failed to get tokens');
    }

    return response.json();
}

// Helper function to get auth token from cookies (for user session only)
export function getAuthTokenFromCookies(cookies: any): string | null {
    return cookies.get('auth_token')?.value || null;
}

// Verify user session token and check if email is allowed
export async function verifyToken(token: string) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userInfo = await response.json();

        // Check if the user's email is in the allowed list
        if (!userInfo.email || !ALLOWED_EMAILS.includes(userInfo.email)) {
            console.error('Unauthorized email attempt:', userInfo.email);
            return null;
        }

        return userInfo;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
} 