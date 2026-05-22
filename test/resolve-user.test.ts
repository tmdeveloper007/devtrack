import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockUpsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(),
    })),
  }));
  const mockFrom = vi.fn(() => ({ select: mockSelect, upsert: mockUpsert }));
  return {
    supabaseAdmin: {
      from: mockFrom,
    },
    _mockSingle: mockSingle,
    _mockUpsert: mockUpsert,
  };
});

import { resolveAppUser } from "@/lib/resolve-user";

describe("resolveAppUser", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns existing user when found", async () => {
    const { _mockSingle } = await import("@/lib/supabase");
    _mockSingle.mockResolvedValueOnce({ data: { id: "existing-user-id" }, error: null });

    const result = await resolveAppUser("12345", "testuser");
    expect(result).toEqual({ id: "existing-user-id" });
  });

  it("upserts user when not found", async () => {
    const { _mockSingle, _mockUpsert } = await import("@/lib/supabase");
    _mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    const upsertSingle = vi.fn();
    upsertSingle.mockResolvedValueOnce({ data: { id: "new-user-id" }, error: null });
    _mockUpsert.mockReturnValueOnce({
      select: vi.fn(() => ({ single: upsertSingle })),
    });

    const result = await resolveAppUser("12345", "newuser");
    expect(result).toEqual({ id: "new-user-id" });
  });

  it("returns null when upsert fails", async () => {
    const { _mockSingle, _mockUpsert } = await import("@/lib/supabase");
    _mockSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST116" } });

    const upsertSingle = vi.fn();
    upsertSingle.mockResolvedValueOnce({ data: null, error: { message: "failed" } });
    _mockUpsert.mockReturnValueOnce({
      select: vi.fn(() => ({ single: upsertSingle })),
    });

    const result = await resolveAppUser("12345", "testuser");
    expect(result).toBeNull();
  });
});
