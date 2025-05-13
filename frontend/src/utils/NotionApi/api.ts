import { CacheManager } from '../cache';
import { Client } from '@notionhq/client';
import { getSecret } from 'astro:env/server';

// Create shared instances
export const notion = new Client({
    auth: getSecret('NOTION_API_KEY'),
});

export let cacheManager: CacheManager | null = null;

// Import all functions from individual modules
import * as clientsModule from './clients';
import * as releasesModule from './releases';
import * as tasksModule from './tasks';
import * as taskStatusModule from './taskStatus';

// Initialize cache for all modules
export function initializeCache(kv: any) {
    cacheManager = new CacheManager(kv);
}

// Re-export all functions with shared instances
export const getClients = clientsModule.getClients;
export const getReleases = releasesModule.getReleases;
export const getTasksFromNotion = tasksModule.getTasksFromNotion;
export const updateTaskCompletion = taskStatusModule.updateTaskCompletion; 