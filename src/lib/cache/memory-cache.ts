/**
 * Lightweight in-memory TTL cache, in-flight request deduplication,
 * and sliding-window rate limiter for hackathon server route handlers.
 *
 * Serverless limitation: In multi-instance serverless environments (e.g. Vercel),
 * in-memory state is scoped per warm function isolate and is not shared globally
 * across concurrent cold instances. HTTP Cache-Control headers complement this layer.
 */

interface CacheEntry<T> {
  value: T;
  createdAtMs: number;
  expiresAtMs: number;
  staleUntilMs: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();
const rateLimitBuckets = new Map<string, number[]>();

export interface CacheLookupResult<T> {
  hit: boolean;
  isStale: boolean;
  value: T | null;
  ageSeconds: number;
  createdAtMs: number;
}

export function getCachedEntry<T>(
  key: string,
  nowMs: number = Date.now()
): CacheLookupResult<T> {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return {
      hit: false,
      isStale: false,
      value: null,
      ageSeconds: 0,
      createdAtMs: 0,
    };
  }

  const ageSeconds = Math.max(0, Math.round((nowMs - entry.createdAtMs) / 1000));
  if (nowMs <= entry.expiresAtMs) {
    return {
      hit: true,
      isStale: false,
      value: entry.value,
      ageSeconds,
      createdAtMs: entry.createdAtMs,
    };
  }

  if (nowMs <= entry.staleUntilMs) {
    return {
      hit: true,
      isStale: true,
      value: entry.value,
      ageSeconds,
      createdAtMs: entry.createdAtMs,
    };
  }

  cacheStore.delete(key);
  return {
    hit: false,
    isStale: false,
    value: null,
    ageSeconds: 0,
    createdAtMs: 0,
  };
}

export function setCachedEntry<T>(
  key: string,
  value: T,
  ttlMs: number,
  staleWindowMs: number = 24 * 60 * 60 * 1000,
  nowMs: number = Date.now()
): void {
  cacheStore.set(key, {
    value,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
    staleUntilMs: nowMs + ttlMs + staleWindowMs,
  });
}

export function dedupeInflight<T>(
  key: string,
  work: () => Promise<T>
): Promise<T> {
  const existing = inflightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = work().finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

export function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowMs: number,
  nowMs: number = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = rateLimitBuckets.get(bucketKey) ?? [];
  const valid = existing.filter((ts) => nowMs - ts < windowMs);

  if (valid.length >= maxRequests) {
    const oldest = valid[0] ?? nowMs;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - nowMs) / 1000)
    );
    rateLimitBuckets.set(bucketKey, valid);
    return { allowed: false, retryAfterSeconds };
  }

  valid.push(nowMs);
  rateLimitBuckets.set(bucketKey, valid);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearMemoryCacheForTests(): void {
  cacheStore.clear();
  inflightRequests.clear();
  rateLimitBuckets.clear();
}
