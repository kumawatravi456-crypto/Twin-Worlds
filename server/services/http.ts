export interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, {
      expiresAt: Date.now() + ttlMs,
      data
    });
  }
}

export async function fetchJsonWithTimeout<T = unknown>(
  url: string,
  timeoutMs = 7000,
  headers?: Record<string, string>
): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'TwinWorlds-SpaceApps2026/2.0',
      ...(headers ?? {})
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
