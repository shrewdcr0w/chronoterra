import { get as idbGet, set as idbSet, clear as idbClear } from 'idb-keyval';

const MAX_MEMORY_ENTRIES = 64;
const memoryCache = new Map<string, unknown>();
const inFlightRequests = new Map<string, Promise<unknown>>();

export interface CacheStats {
  memoryEntries: number;
  hits: number;
  misses: number;
}

let cacheHits = 0;
let cacheMisses = 0;

function setMemoryEntry(key: string, value: unknown): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  } else if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey !== undefined) {
      memoryCache.delete(oldestKey);
    }
  }
  memoryCache.set(key, value);
}

export function buildCacheKey(namespace: string, layerId: string, dateISO: string, qualifier = 'default'): string {
  return `chronoterra:v1:${namespace}:${layerId}:${dateISO}:${qualifier}`;
}

/**
 * Retrieves an item from memory or IndexedDB, or runs `fetcher` once and caches the result in both tiers.
 */
export async function getOrFetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  persistToIdb = true
): Promise<{ data: T; source: 'memory' | 'idb' | 'network' }> {
  // 1. Synchronous Memory Check
  if (memoryCache.has(key)) {
    cacheHits += 1;
    const data = memoryCache.get(key) as T;
    setMemoryEntry(key, data); // refresh LRU order
    return { data, source: 'memory' };
  }

  // 2. Deduplicate concurrent requests for the same key
  if (inFlightRequests.has(key)) {
    const data = (await inFlightRequests.get(key)) as T;
    return { data, source: 'memory' };
  }

  const task = (async (): Promise<{ data: T; source: 'idb' | 'network' }> => {
    // 3. Persistent IndexedDB Check
    if (persistToIdb) {
      try {
        const stored = await idbGet<T>(key);
        if (stored !== undefined) {
          cacheHits += 1;
          setMemoryEntry(key, stored);
          return { data: stored, source: 'idb' };
        }
      } catch {
        // IndexedDB may be unavailable in private browsing or JSDOM tests; continue to network
      }
    }

    // 4. Network Fetch
    cacheMisses += 1;
    const freshData = await fetcher();
    setMemoryEntry(key, freshData);

    if (persistToIdb) {
      try {
        await idbSet(key, freshData);
      } catch {
        // Ignore quota errors on modest devices
      }
    }

    return { data: freshData, source: 'network' };
  })();

  inFlightRequests.set(
    key,
    task.then((res) => res.data)
  );

  try {
    return await task;
  } finally {
    inFlightRequests.delete(key);
  }
}

export function getCacheStats(): CacheStats {
  return {
    memoryEntries: memoryCache.size,
    hits: cacheHits,
    misses: cacheMisses,
  };
}

export async function clearAllCaches(): Promise<void> {
  memoryCache.clear();
  inFlightRequests.clear();
  cacheHits = 0;
  cacheMisses = 0;
  try {
    await idbClear();
  } catch {
    // Ignore in environments without IndexedDB
  }
}