import { google } from 'googleapis';
import type { APIRoute } from 'astro';
import type { drive_v3 } from 'googleapis';
import type { DriveFile } from '../../utils/drive';
import { convertToDriveFile, listFilesInFolder, checkFileExists, getFileLink } from '../../utils/drive';

// Initialize the Google Drive API client
const drive = google.drive('v3');

export const GET: APIRoute = async ({ request, cookies }) => {
    try {
        const token = cookies.get('auth_token')?.value;
        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        const url = new URL(request.url);
        const folderId = url.searchParams.get('folderId');
        const fileName = url.searchParams.get('fileName');

        if (!folderId) {
            return new Response(JSON.stringify({ error: 'Folder ID is required' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (fileName) {
            const exists = await checkFileExists(folderId, fileName, token);
            if (exists) {
                const fileLink = await getFileLink(folderId, fileName, token);
                return new Response(JSON.stringify({ exists: true, fileLink }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
            return new Response(JSON.stringify({ exists: false }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        const files = await listFilesInFolder(folderId, token);
        return new Response(JSON.stringify({ files }), {
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