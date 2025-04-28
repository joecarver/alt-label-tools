import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';

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
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: authToken });

    const response = await drive.files.list({
        auth,
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, webViewLink, mimeType)',
    });

    const files = response.data.files || [];
    return files.map(convertToDriveFile).filter((file): file is DriveFile => file !== null);
}

export async function checkFileExists(folderId: string, fileName: string, authToken: string): Promise<boolean> {
    const drive = google.drive('v3');
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: authToken });

    const response = await drive.files.list({
        auth,
        q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
        fields: 'files(id)',
    });

    return (response.data.files?.length || 0) > 0;
}

export async function getFileLink(folderId: string, fileName: string, authToken: string): Promise<string | null> {
    const drive = google.drive('v3');
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: authToken });

    const response = await drive.files.list({
        auth,
        q: `'${folderId}' in parents and name = '${fileName}' and trashed = false`,
        fields: 'files(webViewLink)',
    });

    return response.data.files?.[0]?.webViewLink || null;
} 