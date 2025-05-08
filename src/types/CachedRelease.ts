import type { Release } from "./Release";

export interface CachedRelease extends Omit<Release, 'tasks'> {
    taskIds: string[];
} 