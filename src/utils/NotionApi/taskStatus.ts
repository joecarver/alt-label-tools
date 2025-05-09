import type { TaskStatus } from "@/types/TaskCompletionStatus";
import { getTaskCompletionStatus } from "@/utils/getTaskCompletionStatus";
import { ReleaseTaskName } from "@/types/ReleaseTask";
import { getFolderId } from '../drive';
import { notion, cacheManager } from './api';

export function initializeCache(kv: any) {
    // This is now handled by the main api.ts
}

export async function getTaskStatus(
    taskId: string,
    clientName: string,
    catalogNumber: string,
    taskName: ReleaseTaskName,
    completedAt: string | null | undefined,
    isDetectable: boolean,
    dueDate: string | null | undefined
): Promise<TaskStatus> {
    const folderId = await getFolderId(`Clients/${clientName}/Releases/${catalogNumber}`);

    const params = {
        clientName,
        releaseId: catalogNumber,
        taskName,
        completedAt: typeof completedAt === 'string' ? completedAt : undefined,
        folderId,
        isDetectable,
        dueDate: dueDate ? dueDate : undefined,
    };


    const status = await getTaskCompletionStatus(params);
    if (!status) {
        throw new Error(`Failed to get task status for task ${taskId}`);
    }
    return status;
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
        await cacheManager.invalidateCache('task', taskId);
    }
} 