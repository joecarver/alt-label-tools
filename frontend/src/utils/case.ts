/**
 * Converts a snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 */
export function keysToCamelCase<T>(obj: any): T {
    if (Array.isArray(obj)) {
        return obj.map((item) => keysToCamelCase(item)) as unknown as T;
    }

    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = snakeToCamel(key);
            result[camelKey] = keysToCamelCase(obj[key]);
            return result;
        }, {} as any) as T;
    }

    return obj as T;
} 