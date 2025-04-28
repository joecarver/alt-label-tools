import { Client } from '@notionhq/client';
import type { LabelClient } from "@/types/LabelClient";
import type { Release } from "@/types/Release";
import type { BlockObjectResponse, DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { ReleaseTaskStatus } from "@/types/ReleaseTaskStatus";

const notion = new Client({
    auth: import.meta.env.NOTION_API_KEY,
});

const cachedReleases: Release[] = [];
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
    if (cachedReleases.length > 0) {
        return cachedReleases;
    }

    const clientResponse = await notion.blocks.children.list({
        block_id: clientId,
    });

    const clientResults = clientResponse.results as BlockObjectResponse[];
    const releaseScheduleDatabase = clientResults.find((result) => result.type === "child_database");


    if (!releaseScheduleDatabase) {
        throw new Error("Release schedule database not found");
    }

    const releaseResponse = await notion.databases.query({
        database_id: releaseScheduleDatabase.id,
    });

    const releaseScheduleResults = releaseResponse.results as DatabaseObjectResponse[];

    const releases: Release[] = [];

    releaseScheduleResults.forEach((result) => {
        const title = result.properties.Name.title[0];
        if (!title) {
            return;
        }

        const titleString = title.plain_text;

        if (!titleString) {
            return;
        }

        const [catalogNumber, artist, taskName] = titleString.split(" - ");


        const task = {
            id: result.id,
            releaseId: catalogNumber,
            name: taskName,
            status: ReleaseTaskStatus.UNKNOWN,
            startDate: result.properties.Date.date.start,
            endDate: result.properties.Date.date.end,
        }

        const release = releases.find((release) => release.catalogNumber === catalogNumber);
        if (release) {
            release.tasks.push(task);
        } else {
            releases.push({
                id: result.id,
                name: titleString,
                catalogNumber: catalogNumber,
                artist: artist,
                tasks: [task],
                labelId: clientId,
                notionUrl: result.url,
            });
        }
    });

    cachedReleases.push(...releases);

    return releases;
}
