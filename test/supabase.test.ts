import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SUPABASE_ADMIN_UNAVAILABLE_MESSAGE,
  isSupabaseAdminAvailable,
} from "@/lib/supabase";

describe("supabase module exports", () => {
  describe("SUPABASE_ADMIN_UNAVAILABLE_MESSAGE", () => {
    it("is a non-empty string", () => {
      expect(typeof SUPABASE_ADMIN_UNAVAILABLE_MESSAGE).toBe("string");
      expect(SUPABASE_ADMIN_UNAVAILABLE_MESSAGE.length).toBeGreaterThan(0);
    });

    it("mentions the required environment variables", () => {
      expect(SUPABASE_ADMIN_UNAVAILABLE_MESSAGE).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(SUPABASE_ADMIN_UNAVAILABLE_MESSAGE).toContain("SUPABASE_SERVICE_ROLE_KEY");
    });
  });

  describe("isSupabaseAdminAvailable (static)", () => {
    // This test documents the current value based on the test environment setup.
    // The value is computed at module load time from process.env.
    // The test verifies that the exported value is a boolean.
    it("is a boolean value", () => {
      expect(typeof isSupabaseAdminAvailable).toBe("boolean");
    });
  });
});

describe("isSupabaseAdminAvailable (env-dependent)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when NEXT_PUBLIC_SUPABASE_URL is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");

    const { isSupabaseAdminAvailable } = await import("@/lib/supabase");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("returns false when SUPABASE_SERVICE_ROLE_KEY is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://my-project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const { isSupabaseAdminAvailable } = await import("@/lib/supabase");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("returns false when URL contains placeholder", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "valid-key");

    const { isSupabaseAdminAvailable } = await import("@/lib/supabase");
    expect(isSupabaseAdminAvailable).toBe(false);
  });

  it("returns true when both env vars are set with a real URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://my-project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "valid-service-role-key");

    const { isSupabaseAdminAvailable } = await import("@/lib/supabase");
    expect(isSupabaseAdminAvailable).toBe(true);
  });
});
