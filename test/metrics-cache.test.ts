import { describe, it, expect, vi, beforeEach } from 'vitest';
import { metricsCacheKey, isMetricsCacheBypassed, cacheGet, cacheSet } from '../src/lib/metrics-cache';
import type { NextRequest } from 'next/server';

describe('metricsCacheKey', () => {
  it('returns a string starting with metrics:', () => {
    const key = metricsCacheKey('user123', 'contributions');
    expect(key.startsWith('metrics:')).toBe(true);
  });

  it('includes userId in key', () => {
    const key = metricsCacheKey('user123', 'contributions');
    expect(key).toContain('user123');
  });

  it('includes endpoint in key', () => {
    const key = metricsCacheKey('user123', 'repos');
    expect(key).toContain('repos');
  });

  it('returns default when no params provided', () => {
    const key = metricsCacheKey('user123', 'contributions');
    expect(key).toBe('metrics:user123:contributions:default');
  });

  it('includes params in key', () => {
    const key = metricsCacheKey('user123', 'contributions', { repo: 'owner/repo' });
    expect(key).toContain('owner%2Frepo');
  });

  it('excludes null and undefined values', () => {
    const key = metricsCacheKey('user123', 'contributions', { foo: 'bar', nullVal: null, undefinedVal: undefined });
    expect(key).not.toContain('nullVal');
    expect(key).not.toContain('undefinedVal');
    expect(key).toContain('foo=bar');
  });

  it('sorts params alphabetically', () => {
    const key1 = metricsCacheKey('user123', 'contributions', { z: '1', a: '2' });
    const key2 = metricsCacheKey('user123', 'contributions', { a: '2', z: '1' });
    expect(key1).toBe(key2);
  });

  it('different params produce different keys', () => {
    const key1 = metricsCacheKey('user123', 'contributions', { repo: 'owner/repo1' });
    const key2 = metricsCacheKey('user123', 'contributions', { repo: 'owner/repo2' });
    expect(key1).not.toBe(key2);
  });
});

describe('isMetricsCacheBypassed', () => {
  const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
    const urlObj = new URL(url);
    return {
      nextUrl: urlObj,
      headers: {
        get: (name: string) => headers[name] || null,
      },
    } as unknown as NextRequest;
  };

  it('returns false when no bypass params present', () => {
    const req = createMockRequest('http://localhost/metrics');
    expect(isMetricsCacheBypassed(req)).toBe(false);
  });

  it('returns true for refresh=1', () => {
    const req = createMockRequest('http://localhost/metrics?refresh=1');
    expect(isMetricsCacheBypassed(req)).toBe(true);
  });

  it('returns true for bypassCache=true', () => {
    const req = createMockRequest('http://localhost/metrics?bypassCache=true');
    expect(isMetricsCacheBypassed(req)).toBe(true);
  });

  it('returns true for sync=yes', () => {
    const req = createMockRequest('http://localhost/metrics?sync=yes');
    expect(isMetricsCacheBypassed(req)).toBe(true);
  });

  it('returns true for x-devtrack-cache-bypass header', () => {
    const req = createMockRequest('http://localhost/metrics', { 'x-devtrack-cache-bypass': 'true' });
    expect(isMetricsCacheBypassed(req)).toBe(true);
  });

  it('is case insensitive for param values', () => {
    const req1 = createMockRequest('http://localhost/metrics?refresh=TRUE');
    const req2 = createMockRequest('http://localhost/metrics?refresh=True');
    const req3 = createMockRequest('http://localhost/metrics?refresh=YES');
    expect(isMetricsCacheBypassed(req1)).toBe(true);
    expect(isMetricsCacheBypassed(req2)).toBe(true);
    expect(isMetricsCacheBypassed(req3)).toBe(true);
  });

  it('returns false for empty string values', () => {
    const req = createMockRequest('http://localhost/metrics?refresh=');
    expect(isMetricsCacheBypassed(req)).toBe(false);
  });
});

describe('cacheGet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns null when Redis client is not available and no cache hit', async () => {
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { cacheGet: getCache } = await import('../src/lib/metrics-cache');
    const result = await getCache('non-existent-key');
    expect(result).toBeNull();
  });

  it('returns cached value from memory cache when not expired', async () => {
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { cacheSet: setCache, cacheGet: getCache } = await import('../src/lib/metrics-cache');

    await setCache('test-key', { value: 'test-data' }, 60);
    const result = await getCache<{ value: string }>('test-key');

    expect(result).toEqual({ value: 'test-data' });
  });

  it('returns null for expired memory cache entry', async () => {
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { cacheSet: setCache, cacheGet: getCache } = await import('../src/lib/metrics-cache');

    await setCache('expired-key', { value: 'old-data' }, -1);
    const result = await getCache<{ value: string }>('expired-key');

    expect(result).toBeNull();
  });
});

describe('cacheSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('stores value in memory cache when Redis is not available', async () => {
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { cacheSet: setCache, cacheGet: getCache } = await import('../src/lib/metrics-cache');

    await setCache('new-key', { data: 'new-value' }, 300);

    const result = await getCache<{ data: string }>('new-key');
    expect(result).toEqual({ data: 'new-value' });
  });

  it('does not throw for invalid TTL values', async () => {
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { cacheSet: setCache } = await import('../src/lib/metrics-cache');

    await expect(setCache('key', 'value', -5)).resolves.not.toThrow();
    await expect(setCache('key', 'value', NaN)).resolves.not.toThrow();
    await expect(setCache('key', 'value', Infinity)).resolves.not.toThrow();
  });

  it('does not throw when memory cache is at capacity', async () => {
    process.env.UPSTASH_REDIS_REST_URL = '';
    process.env.UPSTASH_REDIS_REST_TOKEN = '';

    const { cacheSet: setCache } = await import('../src/lib/metrics-cache');

    for (let i = 0; i < 1005; i++) {
      await setCache(`key-${i}`, `value-${i}`, 3600);
    }

    await expect(setCache('overflow-key', 'overflow-value', 3600)).resolves.not.toThrow();
  });
});