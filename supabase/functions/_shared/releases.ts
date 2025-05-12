import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notion } from "./notion.ts";
import { getFolderId } from "./drive.ts";

export interface Release {
    id: string;
    name: string;
    catalogNumber: string;
    artist: string;
    labelId: string;
    notionUrl: string;
    folderId: string;
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
            notionUrl: `https://notion.so/${databaseId.replace(/-/g, "")}`,
            folderId: folderId ?? "",
        });
    }

    return releases;
}