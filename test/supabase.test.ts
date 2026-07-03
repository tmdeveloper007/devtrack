/** @vitest-environment node */
import { describe, it, expect, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => {
      throw new Error(
        "Supabase admin client is unavailable. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }),
  })),
}));

describe("supabase module exports", () => {
  it("SUPABASE_ADMIN_UNAVAILABLE_MESSAGE is exported and is a non-empty string", async () => {
    const mod = await import("@/lib/supabase");
    expect(typeof mod.SUPABASE_ADMIN_UNAVAILABLE_MESSAGE).toBe("string");
    expect(mod.SUPABASE_ADMIN_UNAVAILABLE_MESSAGE.length).toBeGreaterThan(0);
  });

  it("isSupabaseAdminAvailable is a boolean", async () => {
    const mod = await import("@/lib/supabase");
    expect(typeof mod.isSupabaseAdminAvailable).toBe("boolean");
  });

  it("supabaseAdmin is an object", async () => {
    const mod = await import("@/lib/supabase");
    expect(typeof mod.supabaseAdmin).toBe("object");
    expect(mod.supabaseAdmin).not.toBeNull();
  });

  it("supabaseAdmin has a from method", async () => {
    const mod = await import("@/lib/supabase");
    expect(typeof mod.supabaseAdmin.from).toBe("function");
  });
});
