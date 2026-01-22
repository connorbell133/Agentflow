/**
 * JSON optimization utilities to reduce webpack cache serialization warnings
 * and improve performance for large JSON objects
 */

// Cache for frequently used JSON strings to avoid repeated stringify operations
const jsonStringCache = new Map<string, string>();
const maxCacheSize = 100;

/**
 * Optimized JSON.stringify with caching for frequently used objects
 * Reduces serialization overhead in webpack cache
 */
export function optimizedJsonStringify(
    obj: any,
    space?: number,
    cacheKey?: string
): string {
    // Generate cache key if not provided
    const key = cacheKey ?? generateCacheKey(obj);

    // Check cache first
    if (jsonStringCache.has(key)) {
        return jsonStringCache.get(key)!;
    }

    // Stringify with optimization for large objects
    let result: string;

    try {
        // For large objects, use a replacer to optimize serialization
        if (isLargeObject(obj)) {
            result = JSON.stringify(obj, largeObjectReplacer, space);
        } else {
            result = JSON.stringify(obj, null, space);
        }
    } catch (error) {
        console.warn('JSON stringify failed:', error);
        result = '{}';
    }

    // Cache the result if it's reasonably sized
    if (result.length < 50000) { // Only cache strings smaller than 50KB
        // Implement LRU cache behavior
        if (jsonStringCache.size >= maxCacheSize) {
            const firstKey = jsonStringCache.keys().next().value;
            if (firstKey) {
                jsonStringCache.delete(firstKey);
            }
        }
        jsonStringCache.set(key, result);
    }

    return result;
}

/**
 * Check if an object is considered "large" for optimization purposes
 */
function isLargeObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') return false;

    // Check for common indicators of large objects
    const jsonLength = JSON.stringify(obj).length;
    return jsonLength > 10000; // 10KB threshold
}

/**
 * Custom replacer for large objects to optimize serialization
 */
function largeObjectReplacer(key: string, value: any): any {
    // Skip very large arrays or objects in certain contexts
    if (Array.isArray(value) && value.length > 1000) {
        return `[Array with ${value.length} items]`;
    }

    // Handle circular references
    if (typeof value === 'object' && value !== null) {
        // Simple circular reference detection
        try {
            JSON.stringify(value);
            return value;
        } catch {
            return '[Circular Reference]';
        }
    }

    return value;
}

/**
 * Generate a cache key for an object
 */
function generateCacheKey(obj: any): string {
    if (typeof obj === 'string') return `string_${obj.substring(0, 50)}`;
    if (typeof obj === 'number') return `number_${obj}`;
    if (typeof obj === 'boolean') return `boolean_${obj}`;
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';

    // For objects, create a hash-like key
    const keys = Object.keys(obj).sort().slice(0, 10); // Only use first 10 keys
    return `object_${keys.join('_')}_${Object.keys(obj).length}`;
}

/**
 * Parse JSON with error handling and fallback
 */
export function safeJsonParse<T = any>(jsonString: string, fallback: T): T {
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.warn('JSON parse failed, using fallback:', error);
        return fallback;
    }
}

/**
 * Create a Buffer from JSON string for webpack optimization
 * Use this for very large JSON data that doesn't need frequent access
 */
export function createJsonBuffer(obj: any): Buffer {
    const jsonString = JSON.stringify(obj);
    return Buffer.from(jsonString, 'utf8');
}

/**
 * Parse JSON from Buffer
 */
export function parseJsonBuffer<T = any>(buffer: Buffer, fallback: T): T {
    try {
        const jsonString = buffer.toString('utf8');
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.warn('Buffer JSON parse failed, using fallback:', error);
        return fallback;
    }
}

/**
 * Clear the JSON string cache
 */
export function clearJsonCache(): void {
    jsonStringCache.clear();
}

/**
 * Get cache statistics
 */
export function getJsonCacheStats(): { size: number; maxSize: number } {
    return {
        size: jsonStringCache.size,
        maxSize: maxCacheSize
    };
}
