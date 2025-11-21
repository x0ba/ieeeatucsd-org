/**
 * Cached data structure with validation metadata
 */
interface CachedData<T> {
  value: T;
  timestamp: number;
  version: string;
}

const CACHE_VERSION = "1.0.0";

/**
 * Safe localStorage helpers that guard against environments where storage is
 * unavailable (e.g. Safari private mode) or throws quota errors.
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cached data with validation. Returns null if cache is corrupted or invalid.
 */
export function getValidatedCache<T>(key: string): T | null {
  try {
    const raw = safeLocalStorageGet(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedData<T>;
    
    // Validate cache structure
    if (!cached || typeof cached !== "object" || !("value" in cached) || !("timestamp" in cached) || !("version" in cached)) {
      console.warn(`[getValidatedCache] Invalid cache structure for key: ${key}`);
      safeLocalStorageRemove(key);
      return null;
    }

    // Validate version
    if (cached.version !== CACHE_VERSION) {
      console.warn(`[getValidatedCache] Cache version mismatch for key: ${key}. Expected ${CACHE_VERSION}, got ${cached.version}`);
      safeLocalStorageRemove(key);
      return null;
    }

    return cached.value;
  } catch (error) {
    console.error(`[getValidatedCache] Error parsing cache for key ${key}:`, error);
    safeLocalStorageRemove(key);
    return null;
  }
}

/**
 * Set cached data with validation metadata
 */
export function setValidatedCache<T>(key: string, value: T): boolean {
  try {
    const cached: CachedData<T> = {
      value,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    return safeLocalStorageSet(key, JSON.stringify(cached));
  } catch (error) {
    console.error(`[setValidatedCache] Error setting cache for key ${key}:`, error);
    return false;
  }
}

/**
 * Clear all Firestore IndexedDB caches to resolve cache corruption issues.
 * This is useful when users experience infinite loading states due to stale cache.
 *
 * @returns Promise that resolves to true if cache was cleared successfully
 */
export async function clearFirestoreCache(): Promise<boolean> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return false;
  }

  try {
    // Get all IndexedDB databases
    const databases = await indexedDB.databases();

    // Delete all Firebase-related databases
    const deletePromises = databases
      .filter(
        (db) =>
          db.name &&
          (db.name.includes("firestore") ||
            db.name.includes("firebase") ||
            db.name.startsWith("google-cloud-firestore")),
      )
      .map((db) => {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => {
            console.log(`[clearFirestoreCache] Deleted database: ${db.name}`);
            resolve();
          };
          request.onerror = () => {
            console.error(
              `[clearFirestoreCache] Failed to delete database: ${db.name}`,
            );
            reject(request.error);
          };
          request.onblocked = () => {
            console.warn(
              `[clearFirestoreCache] Delete blocked for database: ${db.name}`,
            );
            // Still resolve as the database will be deleted when unblocked
            resolve();
          };
        });
      });

    await Promise.all(deletePromises);
    console.log("[clearFirestoreCache] Successfully cleared Firestore cache");
    return true;
  } catch (error) {
    console.error(
      "[clearFirestoreCache] Error clearing Firestore cache:",
      error,
    );
    return false;
  }
}
