import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUpstashConfig,
  upstashPipeline,
  upstashRateLimitFixedWindow,
  upstashTryAcquireLock,
} from "@/lib/upstash-rest";

describe("upstash-rest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  describe("getUpstashConfig", () => {
    it("returns null when neither env var is set", () => {
      expect(getUpstashConfig()).toBeNull();
    });

    it("returns null when only URL is set", () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      expect(getUpstashConfig()).toBeNull();
    });

    it("returns null when only token is set", () => {
      process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
      expect(getUpstashConfig()).toBeNull();
    });

    it("returns config when both env vars are set", () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
      expect(getUpstashConfig()).toEqual({
        url: "https://example.upstash.io",
        token: "token123",
      });
    });
  });

  describe("upstashPipeline", () => {
    it("returns empty array when config is missing", async () => {
      const result = await upstashPipeline([["GET", "key"]]);
      expect(result).toEqual([]);
    });

    it("calls fetch with correct URL and headers when config is set", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: "OK" }],
      });
      vi.stubGlobal("fetch", mockFetch);

      await upstashPipeline([["INCR", "counter"]]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.upstash.io/pipeline",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify([["INCR", "counter"]]),
        })
      );
    });

    it("returns parsed JSON array on success", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 5 }, { result: 120 }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashPipeline([["INCR", "a"], ["GET", "b"]]);
      expect(result).toEqual([{ result: 5 }, { result: 120 }]);
    });

    it("returns empty array when response is not ok", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashPipeline([["GET", "key"]]);
      expect(result).toEqual([]);
    });
  });

  describe("upstashRateLimitFixedWindow", () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    });

    it("allows first request and sets TTL when count is 1", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 1 }, { result: -1 }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashRateLimitFixedWindow({
        key: "test-key",
        limit: 10,
        windowSeconds: 60,
      });

      expect(result).toEqual({ allowed: true });
    });

    it("allows request when count is below limit", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 5 }, { result: 55 }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashRateLimitFixedWindow({
        key: "test-key",
        limit: 10,
        windowSeconds: 60,
      });
      expect(result).toEqual({ allowed: true });
    });

    it("blocks request when count exceeds limit", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 11 }, { result: 50 }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashRateLimitFixedWindow({
        key: "test-key",
        limit: 10,
        windowSeconds: 60,
      });
      expect(result).toEqual({ allowed: false, retryAfter: 50 });
    });

    it("allows request with retryAfter when count exceeds limit with no TTL", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 15 }, { result: -1 }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashRateLimitFixedWindow({
        key: "test-key",
        limit: 10,
        windowSeconds: 60,
      });
      expect(result).toEqual({ allowed: false, retryAfter: 60 });
    });

    it("allows request when pipeline returns non-finite count", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: null }, { result: null }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashRateLimitFixedWindow({
        key: "test-key",
        limit: 10,
        windowSeconds: 60,
      });
      expect(result).toEqual({ allowed: true });
    });
  });

  describe("upstashTryAcquireLock", () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    });

    it("returns true when lock is acquired (result is 'OK')", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: "OK" }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashTryAcquireLock({
        key: "lock:job-1",
        ttlSeconds: 30,
      });
      expect(result).toBe(true);
    });

    it("returns false when lock is already held (result is null)", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: null }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await upstashTryAcquireLock({
        key: "lock:job-1",
        ttlSeconds: 30,
      });
      expect(result).toBe(false);
    });

    it("uses custom value when provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: "OK" }],
      });
      vi.stubGlobal("fetch", mockFetch);

      await upstashTryAcquireLock({
        key: "lock:job-1",
        ttlSeconds: 30,
        value: "my-custom-value",
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body as string);
      expect(body[0]).toContain("my-custom-value");
    });
  });
});
