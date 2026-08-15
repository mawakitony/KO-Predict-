const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = { at: number; value: T };

type GlobalHistoryCache = {
  progress: Map<string, CacheEntry<unknown>>;
  attempts: Map<string, CacheEntry<unknown>>;
};

function store(): GlobalHistoryCache {
  const g = globalThis as typeof globalThis & {
    __koPredictLearningHistoryCache?: GlobalHistoryCache;
  };
  if (!g.__koPredictLearningHistoryCache) {
    g.__koPredictLearningHistoryCache = {
      progress: new Map(),
      attempts: new Map(),
    };
  }
  return g.__koPredictLearningHistoryCache;
}

function readCache<T>(
  map: Map<string, CacheEntry<unknown>>,
  key: string,
): T | null {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > HISTORY_CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }
  return hit.value as T;
}

function writeCache<T>(
  map: Map<string, CacheEntry<unknown>>,
  key: string,
  value: T,
) {
  map.set(key, { at: Date.now(), value });
}

export function getCachedProgress(learnworldsUserId: string): unknown[] | null {
  return readCache<unknown[]>(store().progress, learnworldsUserId);
}

export function setCachedProgress(
  learnworldsUserId: string,
  data: unknown[],
) {
  writeCache(store().progress, learnworldsUserId, data);
}

export function getCachedAttempts(
  learnworldsUserId: string,
  assessmentId: string,
): unknown[] | null {
  return readCache<unknown[]>(
    store().attempts,
    `${learnworldsUserId}:${assessmentId}`,
  );
}

export function setCachedAttempts(
  learnworldsUserId: string,
  assessmentId: string,
  data: unknown[],
) {
  writeCache(
    store().attempts,
    `${learnworldsUserId}:${assessmentId}`,
    data,
  );
}

/** Invalide le cache progress (+ attempts) pour un apprenant LW. */
export function invalidateLearningHistoryCache(learnworldsUserId?: string) {
  const s = store();
  if (!learnworldsUserId) {
    s.progress.clear();
    s.attempts.clear();
    return;
  }
  s.progress.delete(learnworldsUserId);
  for (const key of [...s.attempts.keys()]) {
    if (key.startsWith(`${learnworldsUserId}:`)) {
      s.attempts.delete(key);
    }
  }
}

export const LEARNING_HISTORY_CACHE_TTL_MS = HISTORY_CACHE_TTL_MS;
