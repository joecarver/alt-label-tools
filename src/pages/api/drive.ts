import { google } from 'googleapis';
import type { APIRoute } from 'astro';
import type { drive_v3 } from 'googleapis';
import type { DriveFile } from '../../utils/drive';
import { convertToDriveFile } from '../../utils/drive';

// Initialize the Google Drive API client
const drive = google.drive('v3');

export const GET: APIRoute = async ({ request }) => {
    try {
        // TODO: Replace with actual authentication token from SSO
        const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];

        if (!authToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        // Set up the auth client
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: authToken });

        // Get the folder ID from the query parameters
        const url = new URL(request.url);
        const folderId = url.searchParams.get('folderId');

        if (!folderId) {
            return new Response(JSON.stringify({ error: 'Folder ID is required' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        // List files in the specified folder
        const response = await drive.files.list({
            auth,
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, webViewLink, mimeType)',
        });

        const files = response.data.files || [];
        const driveFiles: DriveFile[] = files
            .map(convertToDriveFile)
            .filter((file): file is DriveFile => file !== null);

        return new Response(JSON.stringify({ files: driveFiles }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error accessing Google Drive:', error);
        return new Response(JSON.stringify({ error: 'Failed to access Google Drive' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}; 