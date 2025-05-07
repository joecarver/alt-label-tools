import { Client } from '@notionhq/client';
import type { LabelClient } from "@/types/LabelClient";
import type { Release } from "@/types/Release";
import type { BlockObjectResponse, DatabaseObjectResponse, PageObjectResponse, TitlePropertyItemObjectResponse, DatePropertyItemObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';
import { CompletionStatus } from "@/types/CompletionStatus";
import { ReleaseTaskName, type ReleaseTask } from "@/types/ReleaseTask";
import { getTaskCompletionStatus } from "@/utils/getTaskCompletionStatus";
import { getDueDateStatus } from "@/utils/getDueDateStatus";
import { isDetectableTask } from "@/utils/isDetectableTask";
import { getFolderId } from './drive';

const notion = new Client({
    auth: import.meta.env.NOTION_API_KEY,
});

const cachedReleases: Record<string, Release[]> = {};
const cachedClients: LabelClient[] = [];

export async function getClients(authToken: string): Promise<LabelClient[]> {
    if (cachedClients.length > 0) {
        return cachedClients;
    }

    const clientsBlockId = "1bcaab79f528805bb18cf74fb628292b";
    const response = await notion.blocks.children.list({
        block_id: clientsBlockId,
        page_size: 100,
    });

    const results = response.results as BlockObjectResponse[];

    const clients = await Promise.all(results.filter((result) => result.type === "child_page").map(async (result) => {
        const folderId = await getFolderId(`Clients/${result.child_page.title}`, authToken);
        return {
            id: result.id,
            name: result.child_page.title,
            folderId,
        };
    }));

    cachedClients.push(...clients);

    return clients;
}

export async function getReleases(clientId: string, clientName: string, authToken: string): Promise<Release[]> {
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

        const folderName = `Clients/${clientName}/Releases/${catalogNumber}`;
        const folderId = await getFolderId(folderName, authToken);

        const tasks: ReleaseTask[] = await Promise.all(databaseResults.map(async result => {
            const nameProperty = result.properties.Name;
            const dateProperty = result.properties.Date;
            const completedAtProperty = result.properties.completedAt;

            const title = nameProperty?.type === 'title' ? nameProperty.title[0]?.plain_text || "" : "";
            const date = dateProperty?.type === 'date' ? dateProperty.date : null;
            const completedAt = completedAtProperty?.type === 'date' ? completedAtProperty.date?.start : null;

            const taskTitle = title.split(" - ")[2];
            const taskName = taskTitle as ReleaseTaskName;
            const isDetectable = isDetectableTask(taskName);

            const taskStatus = await getTaskCompletionStatus({
                clientName,
                releaseId: catalogNumber,
                taskName: taskName,
                completedAt: completedAt || "",
                folderId,
                isDetectable,
                authToken: authToken,
            });

            const dueDateStatus = getDueDateStatus(
                date?.end || date?.start || "",
                taskStatus?.status === CompletionStatus.DONE_DETECTED ||
                taskStatus?.status === CompletionStatus.DONE_MANUALLY,
            );

            return {
                id: result.id,
                releaseId: catalogNumber,
                name: taskName,
                status: taskStatus?.status || CompletionStatus.UNKNOWN,
                startDate: date?.start || "",
                endDate: date?.end || date?.start || "",
                completedAt: completedAt || "",
                taskStatus,
                dueDateStatus,
                isDetectable,
            };
        }));

        const releaseDate = tasks.find(task => task.name === ReleaseTaskName.ReleaseDate)?.startDate || "";
        if (releaseDate) {
            releases.push({
                id: databaseId,
                name: databaseTitle,
                catalogNumber,
                artist,
                tasks,
                releaseDate,
                labelId: clientId,
                notionUrl: `https://notion.so/${databaseId.replace(/-/g, '')}`,
                folderId,
            });
        }
    }

    cachedReleases[clientId] = releases;

    return releases;
}

export async function updateTaskCompletion(taskId: string, completedAt: string | null): Promise<void> {
    if (!completedAt) {
        await notion.pages.update({
            page_id: taskId,
            properties: {
                completedAt: null,
            },
        });
        return;
    }

    await notion.pages.update({
        page_id: taskId,
        properties: {
            completedAt: {
                date: {
                    start: completedAt,
                },
            },
        },
    });
}
