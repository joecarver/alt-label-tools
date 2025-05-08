import { Client } from '@notionhq/client';
import type { LabelClient } from "@/types/LabelClient";
import type { Release } from "@/types/Release";
import type { BlockObjectResponse, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { CompletionStatus } from "@/types/CompletionStatus";
import { ReleaseTaskName, type ReleaseTask } from "@/types/ReleaseTask";
import { getTaskCompletionStatus } from "@/utils/getTaskCompletionStatus";
import type { TaskCompletionStatus } from "@/types/TaskCompletionStatus";
import { getDueDateStatus } from "@/utils/getDueDateStatus";
import { isDetectableTask } from "@/utils/isDetectableTask";
import { getFolderId } from './drive';
import { getSecret } from 'astro:env/server';
import { CacheManager, CACHE_TTL, getCachedClients, getCachedReleases, getCachedTaskStatus } from './cache';

const notion = new Client({
    auth: getSecret('NOTION_API_KEY'),
});

let cacheManager: CacheManager | null = null;

export function initializeCache(kv: any) {
    cacheManager = new CacheManager(kv);
}

async function getClientsFromNotion(): Promise<LabelClient[]> {
    const clientsBlockId = "1bcaab79f528805bb18cf74fb628292b";
    const response = await notion.blocks.children.list({
        block_id: clientsBlockId,
        page_size: 100,
    });

    const results = response.results as BlockObjectResponse[];

    const clients = await Promise.all(results.filter((result) => result.type === "child_page").map(async (result) => {
        const folderId = await getFolderId(`Clients/${result.child_page.title}`);
        return {
            id: result.id,
            name: result.child_page.title,
            folderId,
        };
    }));

    return clients;
}

export async function getClients(): Promise<LabelClient[]> {
    if (!cacheManager) {
        return getClientsFromNotion();
    }

    return await getCachedClients(
        cacheManager,
        getClientsFromNotion
    );
}

async function getTaskStatus(
    taskId: string,
    clientName: string,
    catalogNumber: string,
    taskName: ReleaseTaskName,
    completedAt: string | null | undefined,
    folderId: string | null,
    isDetectable: boolean
): Promise<TaskCompletionStatus> {
    const params = {
        clientName,
        releaseId: catalogNumber,
        taskName,
        completedAt: typeof completedAt === 'string' ? completedAt : undefined,
        folderId,
        isDetectable,
    };

    if (!cacheManager) {
        return getTaskCompletionStatus(params);
    }

    return await getCachedTaskStatus(
        cacheManager,
        taskId,
        () => getTaskCompletionStatus(params)
    );
}

async function getReleasesFromNotion(clientId: string, clientName: string): Promise<Release[]> {
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

        const databaseTitle = database.child_database?.title || "Untitled Release";
        const [catalogNumber, artist] = databaseTitle.split(" - ");

        const folderName = `Clients/${clientName}/Releases/${catalogNumber}`;
        const folderId = await getFolderId(folderName);

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

            const taskStatus = await getTaskStatus(
                result.id,
                clientName,
                catalogNumber,
                taskName,
                completedAt,
                folderId,
                isDetectable
            );

            const dueDateStatus = getDueDateStatus(
                date?.end || date?.start || "",
                taskStatus.status === CompletionStatus.DONE_DETECTED ||
                taskStatus.status === CompletionStatus.DONE_MANUALLY,
            );

            return {
                id: result.id,
                releaseId: catalogNumber,
                name: taskName,
                status: taskStatus.status,
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

    return releases;
}

async function getReleasesWithFreshTaskStatuses(releases: Release[], clientName: string): Promise<Release[]> {
    return Promise.all(releases.map(async (release) => {
        const tasks = await Promise.all(release.tasks.map(async (task) => {
            const taskStatus = await getTaskStatus(
                task.id,
                clientName,
                release.catalogNumber,
                task.name,
                task.completedAt,
                release.folderId,
                task.isDetectable
            );

            return {
                ...task,
                taskStatus,
                status: taskStatus.status,
            };
        }));

        return {
            ...release,
            tasks,
        };
    }));
}

export async function getReleases(clientId: string, clientName: string): Promise<Release[]> {
    if (!cacheManager) {
        const releases = await getReleasesFromNotion(clientId, clientName);
        return getReleasesWithFreshTaskStatuses(releases, clientName);
    }

    const releases = await getCachedReleases(
        cacheManager,
        clientId,
        () => getReleasesFromNotion(clientId, clientName)
    );

    return getReleasesWithFreshTaskStatuses(releases, clientName);
}

export async function updateTaskCompletion(taskId: string, completedAt: string | null): Promise<void> {
    if (!completedAt) {
        await notion.pages.update({
            page_id: taskId,
            properties: {
                completedAt: null,
            },
        });
    } else {
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

    // Invalidate relevant caches
    if (cacheManager) {
        // Invalidate the task status cache
        await cacheManager.invalidateCache('taskStatus', taskId);

        // Find the release this task belongs to and invalidate its cache
        const task = await notion.pages.retrieve({ page_id: taskId });
        const parentId = (task as any).parent?.type === 'database_id' ? (task as any).parent.database_id : null;

        if (parentId) {
            await cacheManager.invalidateCache('releases', parentId);
        }
    }
}
