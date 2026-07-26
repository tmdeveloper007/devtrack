import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TEST_URL = "https://test.upstash.io";
const TEST_TOKEN = "test-token-abc";

describe("getUpstashConfig", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null when UPSTASH_REDIS_REST_URL is missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.UPSTASH_REDIS_REST_TOKEN = TEST_TOKEN;

    const { getUpstashConfig } = await import("../src/lib/upstash-rest");
    expect(getUpstashConfig()).toBeNull();
  });

  it("returns null when UPSTASH_REDIS_REST_TOKEN is missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = TEST_URL;

    const { getUpstashConfig } = await import("../src/lib/upstash-rest");
    expect(getUpstashConfig()).toBeNull();
  });

  it("returns config object when both env vars are set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = TEST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = TEST_TOKEN;

    const { getUpstashConfig } = await import("../src/lib/upstash-rest");
    const config = getUpstashConfig();
    expect(config).not.toBeNull();
    expect(config?.url).toBe(TEST_URL);
    expect(config?.token).toBe(TEST_TOKEN);
  });
});

describe("upstashPipeline", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.UPSTASH_REDIS_REST_URL = TEST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = TEST_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns empty array when config is null (no env vars)", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { upstashPipeline } = await import("../src/lib/upstash-rest");
    const result = await upstashPipeline([["GET", "test-key"]]);
    expect(result).toEqual([]);
  });

  it("returns empty array on HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashPipeline } = await import("../src/lib/upstash-rest");
    const result = await upstashPipeline([["GET", "test-key"]]);
    expect(result).toEqual([]);
  });

  it("returns parsed results on success", async () => {
    const mockResults = [{ result: "value1" }, { result: 42 }];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashPipeline } = await import("../src/lib/upstash-rest");
    const result = await upstashPipeline([["GET", "key1"], ["GET", "key2"]]);

    expect(result).toEqual(mockResults);
    expect(mockFetch).toHaveBeenCalledWith(
      `${TEST_URL}/pipeline`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify([["GET", "key1"], ["GET", "key2"]]),
      })
    );
  });

  it("sends correct Authorization and Content-Type headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashPipeline } = await import("../src/lib/upstash-rest");
    await upstashPipeline([["PING"]]);

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${TEST_TOKEN}`);
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("upstashRateLimitFixedWindow", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.UPSTASH_REDIS_REST_URL = TEST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = TEST_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns allowed:true when count is below limit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ result: 3 }, { result: 60 }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashRateLimitFixedWindow } = await import("../src/lib/upstash-rest");
    const result = await upstashRateLimitFixedWindow({ key: "rate:user1", limit: 5, windowSeconds: 60 });
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed:false with retryAfter when count exceeds limit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ result: 10 }, { result: 30 }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashRateLimitFixedWindow } = await import("../src/lib/upstash-rest");
    const result = await upstashRateLimitFixedWindow({ key: "rate:user1", limit: 5, windowSeconds: 60 });
    expect(result).toEqual({ allowed: false, retryAfter: 30 });
  });

  it("returns allowed:true when count is NaN", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ result: null }, { result: null }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashRateLimitFixedWindow } = await import("../src/lib/upstash-rest");
    const result = await upstashRateLimitFixedWindow({ key: "rate:user1", limit: 5, windowSeconds: 60 });
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed:false with windowSeconds when TTL is -2 (no key)", async () => {
    // Mock INCR result (count=6, over limit=5) and TTL=-2 (no key exists)
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ result: 6 }, { result: -2 }]) });
      } else {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashRateLimitFixedWindow } = await import("../src/lib/upstash-rest");
    const result = await upstashRateLimitFixedWindow({ key: "rate:user1", limit: 5, windowSeconds: 60 });
    expect(result).toEqual({ allowed: false, retryAfter: 60 });
  });
});

describe("upstashTryAcquireLock", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.UPSTASH_REDIS_REST_URL = TEST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = TEST_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns true when lock is acquired (result is OK)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ result: "OK" }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashTryAcquireLock } = await import("../src/lib/upstash-rest");
    const result = await upstashTryAcquireLock({ key: "lock:task1", ttlSeconds: 30 });
    expect(result).toBe(true);
  });

  it("returns false when lock is not acquired (result is null)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ result: null }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashTryAcquireLock } = await import("../src/lib/upstash-rest");
    const result = await upstashTryAcquireLock({ key: "lock:task1", ttlSeconds: 30 });
    expect(result).toBe(false);
  });

  it("uses provided value when specified", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ result: "OK" }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { upstashTryAcquireLock } = await import("../src/lib/upstash-rest");
    await upstashTryAcquireLock({ key: "lock:task1", ttlSeconds: 30, value: "my-custom-value" });

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse((call[1].body as string) as string);
    expect(body[0]).toContain("my-custom-value");
  });
});
