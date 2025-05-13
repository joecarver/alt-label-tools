import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
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
    const notionApiKey = Deno.env.get('NOTION_API_KEY')
    if (!notionApiKey) {
        throw new Error('NOTION_API_KEY environment variable is not set')
    }

    const response = await fetch(
        `https://api.notion.com/v1/blocks/${clientId}/children?page_size=100`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${notionApiKey}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Notion API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const results = data.results as BlockObjectResponse[];
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