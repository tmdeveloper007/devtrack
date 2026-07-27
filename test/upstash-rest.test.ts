import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUpstashConfig,
  upstashPipeline,
  upstashRateLimitFixedWindow,
  upstashTryAcquireLock,
} from "../src/lib/upstash-rest";

beforeEach(() => {
  vi.restoreAllMocks();
  // Clear env vars between tests
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("getUpstashConfig", () => {
  it("returns null when UPSTASH_REDIS_REST_URL is missing", () => {
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(getUpstashConfig()).toBeNull();
  });

  it("returns null when UPSTASH_REDIS_REST_TOKEN is missing", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url";
    expect(getUpstashConfig()).toBeNull();
  });

  it("returns null when both env vars are missing", () => {
    expect(getUpstashConfig()).toBeNull();
  });

  it("returns config object when both env vars are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "my-token";
    const result = getUpstashConfig();
    expect(result).toEqual({
      url: "https://url.upstash.io",
      token: "my-token",
    });
  });
});

describe("upstashPipeline", () => {
  it("returns empty array when config is not available", async () => {
    const result = await upstashPipeline([["GET", "key"]]);
    expect(result).toEqual([]);
  });

  it("calls fetch with correct URL and headers", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ result: "OK" }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    await upstashPipeline([["INCR", "counter"]]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://url.upstash.io/pipeline",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify([["INCR", "counter"]]),
      })
    );
  });

  it("returns parsed results on successful response", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ result: 42 }, { result: -1 }]),
    }));

    const result = await upstashPipeline([["INCR", "k"], ["TTL", "k"]]);
    expect(result).toEqual([{ result: 42 }, { result: -1 }]);
  });

  it("returns empty array when fetch fails", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const result = await upstashPipeline([["GET", "key"]]);
    expect(result).toEqual([]);
  });
});

describe("upstashRateLimitFixedWindow", () => {
  it("returns allowed=true when config is unavailable", async () => {
    const result = await upstashRateLimitFixedWindow({
      key: "test-key",
      limit: 10,
      windowSeconds: 60,
    });
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed=true when count is at or below limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { result: 5 },  // count = 5
        { result: 45 }, // ttl = 45 seconds remaining
      ]),
    }));

    const result = await upstashRateLimitFixedWindow({
      key: "test-key",
      limit: 10,
      windowSeconds: 60,
    });
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed=false with retryAfter when count exceeds limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { result: 15 }, // count > limit of 10
        { result: 30 }, // ttl = 30 seconds remaining
      ]),
    }));

    const result = await upstashRateLimitFixedWindow({
      key: "test-key",
      limit: 10,
      windowSeconds: 60,
    });
    expect(result).toEqual({ allowed: false, retryAfter: 30 });
  });

  it("sets expiry on first request (count=1) even when ttl is missing", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { result: 1 },
        { result: -1 }, // no ttl set yet
      ]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await upstashRateLimitFixedWindow({
      key: "test-key",
      limit: 10,
      windowSeconds: 60,
    });
    expect(result).toEqual({ allowed: true });
    // Should have called SETEX after INCR returned count=1
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("allows request when count is NaN", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { result: "not-a-number" },
        { result: 60 },
      ]),
    }));

    const result = await upstashRateLimitFixedWindow({
      key: "test-key",
      limit: 10,
      windowSeconds: 60,
    });
    expect(result).toEqual({ allowed: true });
  });
});

describe("upstashTryAcquireLock", () => {
  it("returns false when config is unavailable", async () => {
    const result = await upstashTryAcquireLock({ key: "lock:key", ttlSeconds: 30 });
    expect(result).toBe(false);
  });

  it("returns true when SET returns OK", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ result: "OK" }]),
    }));

    const result = await upstashTryAcquireLock({ key: "lock:key", ttlSeconds: 30 });
    expect(result).toBe(true);
  });

  it("returns false when SET returns null (already locked)", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ result: null }]),
    }));

    const result = await upstashTryAcquireLock({ key: "lock:key", ttlSeconds: 30 });
    expect(result).toBe(false);
  });

  it("uses provided value when specified", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://url.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ result: "OK" }]),
    });
    vi.stubGlobal("fetch", mockFetch);

    await upstashTryAcquireLock({
      key: "lock:key",
      ttlSeconds: 30,
      value: "my-custom-lock-value",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://url.upstash.io/pipeline",
      expect.objectContaining({
        body: JSON.stringify([["SET", "lock:key", "my-custom-lock-value", "NX", "EX", 30]]),
      })
    );
  });
});
