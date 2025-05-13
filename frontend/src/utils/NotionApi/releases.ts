import type { BlockObjectResponse, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import type { Release } from "frontend/src/types/Release";
import { ReleaseTaskName } from "frontend/src/types/ReleaseTask";
import type { ReleaseTask } from "frontend/src/types/ReleaseTask";
import { getFolderId } from '../drive';
import { getCachedReleases } from '../cache';
import { notion, cacheManager } from './api';

export function initializeCache(kv: any) {
    // This is now handled by the main api.ts
}

export async function getReleasesFromNotion(clientId: string, clientName: string): Promise<Release[]> {
    const response = await notion.blocks.children.list({
        block_id: clientId,
        page_size: 100,
    });

    const results = response.results as BlockObjectResponse[];
    const releaseDatabases = results.filter((result) => result.type === "child_database");

    const releases: Release[] = [];

    for (const database of releaseDatabases) {
        const databaseId = database.id;

        const databaseTitle = database.child_database?.title || "Untitled Release";
        const [catalogNumber, artist] = databaseTitle.split(" - ");

        const folderName = `Clients/${clientName}/Releases/${catalogNumber}`;
        const folderId = await getFolderId(folderName);

        releases.push({
            id: databaseId,
            name: databaseTitle,
            catalogNumber,
            artist,
            labelId: clientId,
            notionUrl: `https://notion.so/${databaseId.replace(/-/g, '')}`,
            folderId,
        });
    }

    return releases;
}

export async function getReleases(clientId: string, clientName: string): Promise<Release[]> {
    if (!cacheManager) {
        return getReleasesFromNotion(clientId, clientName);
    }

    return getCachedReleases(
        cacheManager,
        clientId,
        () => getReleasesFromNotion(clientId, clientName)
    );
} 