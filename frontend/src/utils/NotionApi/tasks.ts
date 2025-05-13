import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { ReleaseTaskName, type ReleaseTask } from "frontend/src/types/ReleaseTask";
import { isDetectableTask } from '../isDetectableTask';
import { getTaskStatus } from './taskStatus';
import { notion, cacheManager } from './api';
import { getCachedReleases, getCachedTask, getCachedTaskIdsForRelease } from '../cache';
import { getReleases } from './releases';

async function getTaskFromNotion(
    taskId: string,
    clientName: string,
    catalogNumber: string,
): Promise<ReleaseTask> {
    const result = await notion.pages.retrieve({ page_id: taskId }) as PageObjectResponse;
    return convertNotionTaskToReleaseTask(result, clientName, catalogNumber);
}

export async function getTasksFromNotion(
    releaseId: string,
    clientName: string,
    catalogNumber: string,
): Promise<ReleaseTask[]> {
    const databaseResponse = await notion.databases.query({
        database_id: releaseId,
    });

    const databaseResults = databaseResponse.results as PageObjectResponse[];

    const tasks = await Promise.all(databaseResults.map((result) =>
        convertNotionTaskToReleaseTask(result, clientName, catalogNumber)
    ));

    return tasks;
}

export async function getTasks(releaseId: string, taskIds: string[], clientName: string, catalogNumber: string) {
    if (!cacheManager) {
        return getTasksFromNotion(releaseId, clientName, catalogNumber);
    }

    const tasks = await Promise.all(taskIds.map((taskId) =>
        getCachedTask(
            cacheManager!,
            taskId,
            () => getTaskFromNotion(taskId, clientName, catalogNumber)
        )
    ));

    cacheManager.updateTasksForRelease(releaseId, tasks);
    return tasks;
}

export async function getTasksForRelease(releaseId: string, clientName: string, catalogNumber: string) {
    if (!cacheManager) {
        return getTasksFromNotion(releaseId, clientName, catalogNumber);
    }

    const taskIds = await getCachedTaskIdsForRelease(
        cacheManager!,
        releaseId,
        () => getTasksFromNotion(releaseId, clientName, catalogNumber).then((tasks) => tasks.map((task) => task.id))
    );

    const tasks = await Promise.all(taskIds.map((taskId) =>
        getCachedTask(
            cacheManager!,
            taskId,
            () => getTaskFromNotion(taskId, clientName, catalogNumber)
        )
    ));
    return tasks;
}

async function convertNotionTaskToReleaseTask(
    result: PageObjectResponse,
    clientName: string,
    catalogNumber: string,
): Promise<ReleaseTask> {
    const nameProperty = result.properties.Name;
    const dateProperty = result.properties.Date;
    const completedAtProperty = result.properties.completedAt;

    const title = nameProperty?.type === 'title' ? nameProperty.title[0]?.plain_text || "" : "";
    const date = dateProperty?.type === 'date' ? dateProperty.date : null;
    const completedAt = completedAtProperty?.type === 'date' ? completedAtProperty.date?.start : null;

    const taskTitle = title.split(" - ")[2];
    const taskName = taskTitle as ReleaseTaskName;
    const isDetectable = isDetectableTask(taskName);

    const taskStatus = await getTaskStatus(result.id, clientName, catalogNumber, taskName, completedAt, isDetectable, date?.end || date?.start || null);

    return {
        id: result.id,
        releaseId: catalogNumber,
        name: taskName,
        startDate: date?.start || "",
        endDate: date?.end || date?.start || "",
        completedAt: completedAt || "",
        taskStatus,
        isDetectable,
    };
}