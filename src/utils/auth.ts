import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Get the base URL for the current environment
const getBaseUrl = () => {
    if (import.meta.env.NODE_ENV === 'production') {
        return import.meta.env.PRODUCTION_URL || 'https://your-production-url.com';
    }
    return 'http://localhost:4321';
};

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
    import.meta.env.GOOGLE_CLIENT_ID,
    import.meta.env.GOOGLE_CLIENT_SECRET,
    `${getBaseUrl()}/api/auth`
);

// Scopes required for Google Drive access
const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

export function generateAuthUrl(): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
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

export async function verifyToken(token: string) {
    try {
        // Instead of verifying the token, we'll try to use it to get user info
        const oauth2 = google.oauth2('v2');
        const auth = new OAuth2Client();
        auth.setCredentials({ access_token: token });

        const userInfo = await oauth2.userinfo.get({ auth });
        return userInfo.data;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

export function getAuthClient(token: string) {
    const client = new OAuth2Client();
    client.setCredentials({ access_token: token });
    return client;
}

// Helper function to get auth token from cookies
export function getAuthTokenFromCookies(cookies: any): string | null {
    return cookies.get('auth_token')?.value || null;
} 