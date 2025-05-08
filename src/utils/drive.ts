import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';
import { getAuthClient } from './auth';
import type { FileInfo } from '@/types/FileInfo';


export function convertToFileInfo(file: drive_v3.Schema$File): FileInfo | null {
    if (!file.id || !file.name || !file.webViewLink || !file.mimeType) {
        return null;
    }
    return {
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
    };
}

export async function listFilesInFolder(folderId: string): Promise<FileInfo[]> {
    const drive = google.drive('v3');
    const auth = getAuthClient();

    try {
        const response = await drive.files.list({
            auth,
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, webViewLink, mimeType)'
        });

        const files = response.data.files || [];
        return files.map(convertToFileInfo).filter((file): file is FileInfo => file !== null);
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
}

export async function getFileInfo(folderId: string | null, fileName: string): Promise<FileInfo | null> {
    if (!folderId) {
        return null;
    }

    const drive = google.drive('v3');
    const auth = getAuthClient();

    try {
        // Search for the file in the specified folder
        const response = await drive.files.list({
            auth,
            q: `'${folderId}' in parents and name contains '${fileName}' and trashed = false`,
            fields: 'files(id, name, webViewLink, mimeType, createdTime)'
        });

        // If no exact match, try a more flexible search
        if (!response.data.files?.length) {
            const flexibleResponse = await drive.files.list({
                auth,
                q: `'${folderId}' in parents and name contains '${fileName.toLowerCase()}' and trashed = false`,
                fields: 'files(id, name, webViewLink, mimeType, createdTime)'
            });

            return flexibleResponse.data.files?.[0] ? convertToFileInfo(flexibleResponse.data.files[0]) : null;
        }

        return response.data.files[0] ? convertToFileInfo(response.data.files[0]) : null;
    } catch (error) {
        console.error('Error getting file info:', error);
        throw error;
    }
}

export async function getFolderId(folderName: string): Promise<string | null> {
    const drive = google.drive('v3');
    const auth = getAuthClient();

    // If the folderName contains slashes, it's a path
    const pathParts = folderName.split('/').filter(part => part.trim() !== '');

    // For the first part of the path, we need to search in shared folders
    if (pathParts.length > 0) {
        try {
            // First, find the root folder that was shared with the service account
            const rootResponse = await drive.files.list({
                auth,
                q: `name = '${pathParts[0]}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and sharedWithMe = true`,
                fields: 'files(id)'
            });

            if (!rootResponse.data.files?.length) {
                return null;
            }

            let currentFolderId = rootResponse.data.files[0].id!;

            // Now traverse the rest of the path
            for (let i = 1; i < pathParts.length; i++) {
                const folderPart = pathParts[i];

                const response = await drive.files.list({
                    auth,
                    q: `'${currentFolderId}' in parents and name = '${folderPart}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                    fields: 'files(id)'
                });

                if (!response.data.files?.length) {
                    return null;
                }

                currentFolderId = response.data.files[0].id!;
            }

            return currentFolderId;
        } catch (error) {
            console.error('Error searching for folders:', error);
            throw error;
        }
    }

    return null;
} 