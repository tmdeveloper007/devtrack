import { describe, it, expect, beforeEach, vi } from "vitest";

describe("upstash-rest", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("getUpstashConfig", () => {
    it("returns null when both env vars are missing", async () => {
      const { getUpstashConfig } = await import("@/lib/upstash-rest");
      expect(getUpstashConfig()).toBeNull();
    });

    it("returns null when only URL is set", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock.upstash.io";
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      const { getUpstashConfig } = await import("@/lib/upstash-rest");
      try {
        expect(getUpstashConfig()).toBeNull();
      } finally {
        delete process.env.UPSTASH_REDIS_REST_URL;
      }
    });

    it("returns null when only token is set", async () => {
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock_token_123";
      delete process.env.UPSTASH_REDIS_REST_URL;
      const { getUpstashConfig } = await import("@/lib/upstash-rest");
      try {
        expect(getUpstashConfig()).toBeNull();
      } finally {
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
      }
    });

    it("returns config object when both env vars are set", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock_token_abc";
      const { getUpstashConfig } = await import("@/lib/upstash-rest");
      try {
        const config = getUpstashConfig();
        expect(config).toEqual({
          url: "https://mock.upstash.io",
          token: "mock_token_abc",
        });
      } finally {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
      }
    });

    it("returns config with correct URL and token values", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://region1.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "secret_xyz789";
      const { getUpstashConfig } = await import("@/lib/upstash-rest");
      try {
        const config = getUpstashConfig();
        expect(config?.url).toBe("https://region1.upstash.io");
        expect(config?.token).toBe("secret_xyz789");
      } finally {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
      }
    });
  });
});
