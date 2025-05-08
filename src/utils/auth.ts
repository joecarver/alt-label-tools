// List of allowed email addresses
const ALLOWED_EMAILS = [
    'joe.crvr1@gmail.com',
    'altlabeltools@gmail.com'
];

// Get the base URL for the current environment
const getBaseUrl = () => {
    if (import.meta.env.NODE_ENV === 'production') {
        const url = import.meta.env.PRODUCTION_URL;
        console.log('Production URL:', url, import.meta.env.NODE_ENV);
        return url;
    }
    return 'http://localhost:4321';
};

// Scopes required for user authentication
const USER_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

export function generateAuthUrl(): string {
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth`;
    console.log('Generating auth URL with redirect URI:', redirectUri);
    console.log('Client ID:', import.meta.env.GOOGLE_CLIENT_ID);

    const params = new URLSearchParams({
        client_id: import.meta.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: USER_SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getTokens(code: string) {
    const baseUrl = getBaseUrl();
    const redirectUri = `${baseUrl}/api/auth`;
    console.log('Getting tokens with redirect URI:', redirectUri);

    const params = new URLSearchParams({
        code,
        client_id: import.meta.env.GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
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
        const errorText = await response.text();
        console.error('Token request failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
        });
        throw new Error(`Failed to get tokens: ${errorText}`);
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