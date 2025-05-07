import { google } from 'googleapis';
import type { APIRoute } from 'astro';
import { convertToDriveFile, listFilesInFolder, checkFileExists, getFileInfo, getFolderId } from '../../utils/drive';

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
        const folderName = url.searchParams.get('folderName');
        const fileName = url.searchParams.get('fileName');

        if (!folderName) {
            return new Response(JSON.stringify({ error: 'Folder name is required' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (fileName) {
            const exists = await checkFileExists(folderName, fileName, token);
            if (exists) {
                const folderId = await getFolderId(folderName, token);
                if (!folderId) {
                    return new Response(JSON.stringify({ error: 'Folder not found' }), {
                        status: 404,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                }
                const fileLink = await getFileInfo(folderId, fileName, token);
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

        const folderId = await getFolderId(folderName, token);
        if (!folderId) {
            return new Response(JSON.stringify({ error: 'Folder not found' }), {
                status: 404,
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