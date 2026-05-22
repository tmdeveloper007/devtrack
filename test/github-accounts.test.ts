import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mergeMetrics, pickBestToken, getAllTokens, getLinkedAccounts, getRateLimitRemaining, getAccountToken } from "@/lib/github-accounts";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptToken } from "@/lib/crypto";

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("mergeMetrics", () => {
  const merge = (a: number, b: number) => a + b;

  it("returns null for empty array", () => {
    const result = mergeMetrics([], merge);
    expect(result).toBeNull();
  });

  it("returns null when all results are rejected", () => {
    const results: PromiseSettledResult<number>[] = [
      { status: "rejected", reason: new Error("fail") },
      { status: "rejected", reason: new Error("fail") },
    ];
    const result = mergeMetrics(results, merge);
    expect(result).toBeNull();
  });

  it("returns first fulfilled value when only one succeeds", () => {
    const results: PromiseSettledResult<number>[] = [
      { status: "fulfilled", value: 42 },
      { status: "rejected", reason: new Error("fail") },
    ];
    const result = mergeMetrics(results, merge);
    expect(result).toBe(42);
  });

  it("merges multiple fulfilled values using merge function", () => {
    const results: PromiseSettledResult<number>[] = [
      { status: "fulfilled", value: 10 },
      { status: "fulfilled", value: 20 },
      { status: "fulfilled", value: 30 },
    ];
    const result = mergeMetrics(results, merge);
    expect(result).toBe(60);
  });

  it("skips rejected results and only merges fulfilled", () => {
    const results: PromiseSettledResult<number>[] = [
      { status: "fulfilled", value: 10 },
      { status: "rejected", reason: new Error("fail") },
      { status: "fulfilled", value: 30 },
    ];
    const result = mergeMetrics(results, merge);
    expect(result).toBe(40);
  });

  it("works with non-number types", () => {
    const mergeStrings = (a: string, b: string) => `${a},${b}`;
    const results: PromiseSettledResult<string>[] = [
      { status: "fulfilled", value: "a" },
      { status: "fulfilled", value: "b" },
      { status: "fulfilled", value: "c" },
    ];
    const result = mergeMetrics(results, mergeStrings);
    expect(result).toBe("a,b,c");
  });

  it("returns value directly when only one fulfilled", () => {
    const results: PromiseSettledResult<number>[] = [
      { status: "fulfilled", value: 99 },
    ];
    const result = mergeMetrics(results, merge);
    expect(result).toBe(99);
  });
});

describe("getRateLimitRemaining", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns remaining from rate limit response", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ resources: { core: { remaining: 5000 } } }),
      })
    );
    global.fetch = mockFetch;

    const result = await getRateLimitRemaining("test-token");
    expect(result).toBe(5000);
  });

  it("returns 0 when response is not ok", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      })
    );
    global.fetch = mockFetch;

    const result = await getRateLimitRemaining("bad-token");
    expect(result).toBe(0);
  });

  it("returns 0 when fetch throws", async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error("network error")));
    global.fetch = mockFetch;

    const result = await getRateLimitRemaining("test-token");
    expect(result).toBe(0);
  });

  it("returns 0 when remaining is undefined", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ resources: {} }),
      })
    );
    global.fetch = mockFetch;

    const result = await getRateLimitRemaining("test-token");
    expect(result).toBe(0);
  });
});

describe("pickBestToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws error when no tokens provided", async () => {
    await expect(pickBestToken([])).rejects.toThrow("No tokens available");
  });

  it("returns single token when only one is provided", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ resources: { core: { remaining: 1000 } } }),
      })
    );
    global.fetch = mockFetch;

    const result = await pickBestToken(["single-token"]);
    expect(result).toBe("single-token");
  });

  it("returns token with highest remaining", async () => {
    let callCount = 0;
    const mockFetch = vi.fn(() => {
      const remaining = [3000, 5000, 1000][callCount++];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ resources: { core: { remaining } } }),
      });
    });
    global.fetch = mockFetch;

    const result = await pickBestToken(["token-a", "token-b", "token-c"]);
    expect(result).toBe("token-b");
  });
});

describe("getAllTokens", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns primary token when no linked accounts", async () => {
    const mockEq = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom());

    const result = await getAllTokens("primary-token", "user-123");
    expect(result).toEqual(["primary-token"]);
  });
});

describe("getLinkedAccounts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when no linked accounts", async () => {
    const mockEq = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom());

    const result = await getLinkedAccounts("user-123");
    expect(result).toEqual([]);
  });
});

describe("getAccountToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no account found", async () => {
    const mockFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: { code: "PGRST116" } })),
          })),
        })),
      })),
    }));
    (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom());

    const result = await getAccountToken("user-123", "nonexistent-account");
    expect(result).toBeNull();
  });
});
