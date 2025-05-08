import { CompletionStatus } from "@/types/CompletionStatus";
import type { LabelClient } from "@/types/LabelClient";
import type { Release } from "@/types/Release";
import type { ReleaseTask } from "@/types/ReleaseTask";
import type { TaskCompletionStatus } from "@/types/TaskCompletionStatus";

// Cache keys structure
export const CACHE_KEYS = {
    clients: 'ALT_LABEL_TOOLS_clients',
    releases: (clientId: string) => `ALT_LABEL_TOOLS_releases:${clientId}`,
    taskStatus: (taskId: string) => `ALT_LABEL_TOOLS_taskStatus:${taskId}`,
};

// Cache TTLs in seconds
export const CACHE_TTL = {
    clients: 60 * 15, // 15 minutes
    releases: 60 * 10, // 10 minutes
    tasks: 60 * 5,    // 5 minutes
    taskStatus: 60 * 5 // 5 minutes
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

    async invalidateCache(type: 'clients' | 'releases' | 'taskStatus', id?: string) {
        if (type === 'clients') {
            await this.kv.delete(CACHE_KEYS.clients);
            return;
        }

        if (id) {
            await this.kv.delete(CACHE_KEYS[type](id));
        }
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
    fetchFn: () => Promise<Release[]>
): Promise<Release[]> {
    return cacheManager.getWithTTL(CACHE_KEYS.releases(clientId), CACHE_TTL.releases, fetchFn);
}

export async function getCachedTaskStatus(
    cacheManager: CacheManager,
    taskId: string,
    fetchFn: () => Promise<TaskCompletionStatus | null>
): Promise<TaskCompletionStatus | null> {
    return cacheManager.getWithTTL(CACHE_KEYS.taskStatus(taskId), CACHE_TTL.taskStatus, fetchFn);
} 