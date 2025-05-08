import { JWT, OAuth2Client } from 'google-auth-library';

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

// Initialize OAuth2 client for user authentication
const oauth2Client = new OAuth2Client(
    import.meta.env.GOOGLE_CLIENT_ID,
    import.meta.env.GOOGLE_CLIENT_SECRET,
    `${getBaseUrl()}/api/auth`
);

// Format the private key by replacing literal \n with actual newlines
const formatPrivateKey = (key: string) => {
    return key.replace(/\\n/g, '\n');
};

// Initialize service account client for Drive access
const serviceAccount = new JWT({
    email: import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: formatPrivateKey(import.meta.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
    ]
});

// Scopes required for user authentication
const USER_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

export function generateAuthUrl(): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: USER_SCOPES,
        prompt: 'consent',
        redirect_uri: `${getBaseUrl()}/api/auth`
    });
}

export async function getTokens(code: string) {
    const { tokens } = await oauth2Client.getToken({
        code,
        redirect_uri: `${getBaseUrl()}/api/auth`
    });
    return tokens;
}

// Get service account client for Drive operations
export function getAuthClient() {
    return serviceAccount;
}

// Helper function to get auth token from cookies (for user session only)
export function getAuthTokenFromCookies(cookies: any): string | null {
    return cookies.get('auth_token')?.value || null;
}

// Verify user session token and check if email is allowed
export async function verifyToken(token: string) {
    try {
        const auth = new OAuth2Client();
        auth.setCredentials({ access_token: token });

        // Use fetch directly to call the userinfo endpoint
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