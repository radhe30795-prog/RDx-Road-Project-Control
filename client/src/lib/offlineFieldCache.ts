const ROADS_CACHE_KEY = "rdx_roads_cache_v1";
const ACTIVITIES_CACHE_PREFIX = "rdx_activities_cache_v1_";

function readJson<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Quota/private-mode errors should never block field data entry.
    console.warn("[Offline Field Cache] Could not write cache", error);
  }
}

export function readCachedRoads<T>(): T | undefined {
  return readJson<T>(ROADS_CACHE_KEY);
}

export function writeCachedRoads<T>(roads: T): void {
  writeJson(ROADS_CACHE_KEY, roads);
}

export function readCachedActivities<T>(roadId: number): T | undefined {
  return readJson<T>(`${ACTIVITIES_CACHE_PREFIX}${roadId}`);
}

export function writeCachedActivities<T>(roadId: number, activities: T): void {
  writeJson(`${ACTIVITIES_CACHE_PREFIX}${roadId}`, activities);
}

export function getFieldCacheTimestamp(key: "roads" | `activities:${number}`): number | undefined {
  const storageKey = key === "roads" ? ROADS_CACHE_KEY : `${ACTIVITIES_CACHE_PREFIX}${key.split(":")[1]}`;
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`${storageKey}_timestamp`);
    return raw ? Number(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function markFieldCacheUpdated(key: "roads" | `activities:${number}`): void {
  const storageKey = key === "roads" ? ROADS_CACHE_KEY : `${ACTIVITIES_CACHE_PREFIX}${key.split(":")[1]}`;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${storageKey}_timestamp`, String(Date.now()));
  } catch {
    // Best effort only.
  }
}
