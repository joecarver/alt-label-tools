import type { CachedRelease } from "@/types/CachedRelease";
import type { LabelClient } from "@/types/LabelClient";
import type { ReleaseTask } from "@/types/ReleaseTask";
import type { TaskStatus } from "@/types/TaskCompletionStatus";


// Cache keys structure
export const CACHE_KEYS = {
    clients: 'clients',
    releases: (clientId: string) => `releases:${clientId}`,
    task: (taskId: string) => `task:${taskId}`,
    taskStatus: (taskId: string) => `taskStatus:${taskId}`,
};

// Cache TTLs in seconds
export const CACHE_TTL = {
    clients: 60 * 15, // 15 minutes
    releases: 60 * 10, // 10 minutes
    task: 60 * 10,    // 10 minutes (same as releases)
    taskStatus: 60 * 5, // 5 minutes
};

// Cache interface
export interface Cache {
    get<T>(key: string): Promise<T | null>;
    put(key: string, value: any, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
}

// Cache manager class
export class CacheManager {
    constructor(private kv: Cache) { }

    async getWithTTL<T>(
        key: string,
        ttl: number,
        fetchFn: () => Promise<T>
    ): Promise<T> {
        const cached = await this.kv.get<string>(key);
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as T;
                console.log(`📦 Cache HIT: ${key}`);
                return parsed;
            } catch (error) {
                console.error(`Error parsing cached data for ${key}:`, error);
                // If parsing fails, continue to fetch fresh data
            }
        }

        console.log(`❌ Cache MISS: ${key}`);
        const data = await fetchFn();
        await this.kv.put(key, JSON.stringify(data), {
            expirationTtl: ttl
        });

        return data;
    }

    async invalidateCache(type: 'clients' | 'releases' | 'task' | 'taskStatus', id?: string) {
        if (type === 'clients') {
            await this.kv.delete(CACHE_KEYS.clients);
            return;
        }

        if (id) {
            await this.kv.delete(CACHE_KEYS[type](id));
        }
    }

    async updateTask(task: ReleaseTask) {
        const key = CACHE_KEYS.task(task.id);
        await this.kv.put(key, JSON.stringify(task), {
            expirationTtl: CACHE_TTL.task
        });
        console.log(`📝 Updated task cache: ${task.id}`);
    }
}

// Helper functions for type-safe cache operations
export async function getCachedClients(
    cacheManager: CacheManager,
    fetchFn: () => Promise<LabelClient[]>
): Promise<LabelClient[]> {
    return cacheManager.getWithTTL(CACHE_KEYS.clients, CACHE_TTL.clients, fetchFn);
}

export async function getCachedReleases(
    cacheManager: CacheManager,
    clientId: string,
    fetchFn: () => Promise<CachedRelease[]>
): Promise<CachedRelease[]> {
    return cacheManager.getWithTTL(CACHE_KEYS.releases(clientId), CACHE_TTL.releases, fetchFn);
}

export async function getCachedTask(
    cacheManager: CacheManager,
    taskId: string,
    fetchFn: () => Promise<ReleaseTask>
): Promise<ReleaseTask> {
    return cacheManager.getWithTTL(CACHE_KEYS.task(taskId), CACHE_TTL.task, fetchFn);
}

export async function getCachedTaskStatus(
    cacheManager: CacheManager,
    taskId: string,
    fetchFn: () => Promise<TaskStatus | null>
): Promise<TaskStatus | null> {
    return cacheManager.getWithTTL(CACHE_KEYS.taskStatus(taskId), CACHE_TTL.taskStatus, fetchFn);
}

export async function getCachedTasks(
    cacheManager: CacheManager,
    taskIds: string[],
    fetchFn: (taskId: string) => Promise<ReleaseTask>
): Promise<ReleaseTask[]> {
    return Promise.all(taskIds.map(taskId =>
        getCachedTask(cacheManager, taskId, () => fetchFn(taskId))
    ));
} 