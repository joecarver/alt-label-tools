import { Client } from '@notionhq/client';
import type { LabelClient } from "@/types/LabelClient";
import type { Release } from "@/types/Release";
import type { BlockObjectResponse, DatabaseObjectResponse, PageObjectResponse, TitlePropertyItemObjectResponse, DatePropertyItemObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';
import { ReleaseTaskStatus } from "@/types/ReleaseTaskStatus";
import { ReleaseTaskName } from "@/types/ReleaseTask";

const notion = new Client({
    auth: import.meta.env.NOTION_API_KEY,
});

const cachedReleases: Record<string, Release[]> = {};
const cachedClients: LabelClient[] = [];

export async function getClients(): Promise<LabelClient[]> {
    if (cachedClients.length > 0) {
        return cachedClients;
    }

    const clientsBlockId = "1bcaab79f528805bb18cf74fb628292b";
    const response = await notion.blocks.children.list({
        block_id: clientsBlockId,
        page_size: 100,
    });

    const results = response.results as BlockObjectResponse[];

    const clients = results.filter((result) => result.type === "child_page").map((result) => ({
        id: result.id,
        name: result.child_page.title,
    }));

    cachedClients.push(...clients);

    return clients;
}

export async function getReleases(clientId: string): Promise<Release[]> {
    if (cachedReleases[clientId]) {
        return cachedReleases[clientId];
    }

    const response = await notion.blocks.children.list({
        block_id: clientId,
        page_size: 100,
    });

    const results = response.results as BlockObjectResponse[];
    const releaseDatabases = results.filter((result) => result.type === "child_database");

    const releases: Release[] = [];

    for (const database of releaseDatabases) {
        const databaseId = database.id;
        const databaseResponse = await notion.databases.query({
            database_id: databaseId,
        });

        const databaseResults = databaseResponse.results as PageObjectResponse[];

        // Get the database title which should be the release name
        const databaseTitle = database.child_database?.title || "Untitled Release";
        const [catalogNumber, artist] = databaseTitle.split(" - ");

        const tasks = databaseResults.map(result => {
            const nameProperty = result.properties.Name;
            const dateProperty = result.properties.Date;

            const title = nameProperty?.type === 'title' ? nameProperty.title[0]?.plain_text || "" : "";
            const date = dateProperty?.type === 'date' ? dateProperty.date : null;

            const taskTitle = title.split(" - ")[2];

            return {
                id: result.id,
                releaseId: catalogNumber,
                name: taskTitle as ReleaseTaskName,
                status: ReleaseTaskStatus.UNKNOWN,
                startDate: date?.start || "",
                endDate: date?.end || date?.start || "",
            };
        });

        const releaseDate = tasks.find(task => task.name === ReleaseTaskName.ReleaseDate)?.startDate || "";
        console.log(databaseTitle);
        releases.push({
            id: databaseId,
            name: databaseTitle,
            catalogNumber: catalogNumber,
            artist: artist,
            tasks: tasks,
            releaseDate: releaseDate,
            labelId: clientId,
            notionUrl: `https://notion.so/${databaseId.replace(/-/g, '')}`,
        });
    }

    cachedReleases[clientId] = releases;


    return releases;
}
