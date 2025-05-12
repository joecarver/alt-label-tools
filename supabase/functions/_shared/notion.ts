import { Client } from "@notionhq/client";
import { createClient } from "@supabase/supabase-js";

// Create shared instances
export const notion = new Client({
    auth: Deno.env.get("NOTION_API_KEY"),
});

// Create Supabase client for caching
export const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Cache management
export class CacheManager {
    private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
    private readonly TTL = 5 * 60 * 1000; // 5 minutes

    async get<T>(key: string): Promise<T | null> {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        return cached.data as T;
    }

    async set<T>(key: string, data: T): Promise<void> {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }
}

export const cacheManager = new CacheManager(); 