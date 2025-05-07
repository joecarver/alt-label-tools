import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import { getAuthClient } from './auth';

// Type for the Google Drive file response
export interface DriveFile {
    id: string;
    name: string;
    webViewLink: string;
    mimeType: string;
}

// Helper function to safely convert Google Drive API response to our DriveFile type
export function convertToDriveFile(file: drive_v3.Schema$File): DriveFile | null {
    if (!file.id || !file.name || !file.webViewLink || !file.mimeType) {
        return null;
    }
    return {
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink,
        mimeType: file.mimeType,
    };
}

export async function listFilesInFolder(folderId: string, authToken: string): Promise<DriveFile[]> {
    const drive = google.drive('v3');
    const auth = getAuthClient(authToken);

    const response = await drive.files.list({
        auth,
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, webViewLink, mimeType)',
    });

    const files = response.data.files || [];
    return files.map(convertToDriveFile).filter((file): file is DriveFile => file !== null);
}

export async function checkFileExists(folderName: string, fileName: string, authToken: string): Promise<boolean> {
    const drive = google.drive('v3');
    const auth = getAuthClient(authToken);

    const folderId = await getFolderId(folderName, authToken);
    if (!folderId) {
        return false;
    }

    const response = await drive.files.list({
        auth,
        q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
        fields: 'files(id)',
    });

    return (response.data.files?.length || 0) > 0;
}

export async function getFileLink(folderId: string, fileName: string, authToken: string): Promise<string | null> {
    const drive = google.drive('v3');
    const auth = getAuthClient(authToken);

    const response = await drive.files.list({
        auth,
        q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
        fields: 'files(webViewLink)',
    });

    return response.data.files?.[0]?.webViewLink || null;
}

export async function getFolderId(folderName: string, authToken: string, parentFolderId?: string): Promise<string | null> {
    const drive = google.drive('v3');
    const auth = getAuthClient(authToken);

    // If the folderName contains slashes, it's a path
    const pathParts = folderName.split('/').filter(part => part.trim() !== '');

    // Start with the root folder or provided parent folder
    let currentFolderId = parentFolderId || 'root';

    console.log({ pathParts, currentFolderId });
    // Traverse the path
    for (const folderPart of pathParts) {
        const response = await drive.files.list({
            auth,
            q: `'${currentFolderId}' in parents and name = '${folderPart}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
        });

        if (!response.data.files?.length) {
            return null; // Folder not found
        }

        currentFolderId = response.data.files[0].id!;
    }

    return currentFolderId;
} 