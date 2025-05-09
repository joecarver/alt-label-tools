export class MemoryKV implements KVNamespace {
    // Static store that persists across instances
    private static store: Map<string, { value: string; expiration?: number }> = new Map();

    async get(key: string): Promise<string | null> {
        const item = MemoryKV.store.get(key);
        if (!item) return null;

        // Check if item has expired
        if (item.expiration && item.expiration < Date.now()) {
            MemoryKV.store.delete(key);
            return null;
        }

        return item.value;
    }

    async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
        const expiration = options?.expirationTtl
            ? Date.now() + (options.expirationTtl * 1000)
            : undefined;

        MemoryKV.store.set(key, { value, expiration });
    }

    async delete(key: string): Promise<void> {
        MemoryKV.store.delete(key);
    }
} 