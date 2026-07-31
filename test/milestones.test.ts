import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/milestones/route";

// ─── mock factory ───────────────────────────────────────────────────────────

const { mocks, supabaseMock } = vi.hoisted(() => {
  const supabaseMock: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    count: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  };
  // Set up chainable methods to return supabaseMock itself
  for (const key of ["from", "select", "eq", "order", "limit", "count", "insert"]) {
    supabaseMock[key] = supabaseMock[key].mockReturnValue(supabaseMock);
  }

  const mocks = {
    getServerSession: vi.fn(),
    resolveAppUser: vi.fn(),
  };

  return { mocks, supabaseMock };
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: supabaseMock,
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mocks.resolveAppUser,
}));

// ─── helpers ────────────────────────────────────────────────────────────────

function makePostRequest(body: object): Request {
  return new Request("http://localhost/api/milestones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authedSession() {
  mocks.getServerSession.mockResolvedValue({
    githubId: "12345",
    githubLogin: "testuser",
  });
  mocks.resolveAppUser.mockResolvedValue({ id: "uid1" });
}

function resetAll() {
  // Reset call counts
  mocks.getServerSession.mockClear();
  mocks.resolveAppUser.mockClear();
  supabaseMock.from.mockClear();
  supabaseMock.select.mockClear();
  supabaseMock.eq.mockClear();
  supabaseMock.order.mockClear();
  supabaseMock.limit.mockClear();
  supabaseMock.count.mockClear();
  supabaseMock.insert.mockClear();
  supabaseMock.single.mockClear();
  // Reset mockResolvedValue/implementation for non-chain-end methods
  // (chain-end mocks like single, count need fresh implementations per test)
  // Re-apply chainable mockReturnValue
  supabaseMock.from.mockReturnValue(supabaseMock);
  supabaseMock.select.mockReturnValue(supabaseMock);
  supabaseMock.eq.mockReturnValue(supabaseMock);
  supabaseMock.order.mockReturnValue(supabaseMock);
  supabaseMock.limit.mockReturnValue(supabaseMock);
  supabaseMock.count.mockReturnValue(supabaseMock);
  supabaseMock.insert.mockReturnValue(supabaseMock);
}

describe("GET /api/milestones", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns 401 when not authenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no githubId", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345" });
    mocks.resolveAppUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found");
  });

  it("returns milestones for authenticated user", async () => {
    authedSession();
    const milestones = [
      { id: "1", title: "First milestone" },
      { id: "2", title: "Second milestone" },
    ];
    supabaseMock.limit.mockResolvedValue({ data: milestones, error: null });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.milestones).toHaveLength(2);
  });

  it("returns 500 on DB error", async () => {
    authedSession();
    supabaseMock.limit.mockResolvedValue({ data: null, error: { message: "DB_ERROR" } });

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch milestones");
  });
});

describe("POST /api/milestones", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns 401 when not authenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest({ title: "Test", targetValue: 10 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    authedSession();
    const badReq = new Request("http://localhost/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(badReq as unknown as Request);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 when title is missing", async () => {
    authedSession();
    const res = await POST(makePostRequest({ targetValue: 10 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("title must be a non-empty string");
  });

  it("returns 400 when title is empty string", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "", targetValue: 10 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("title must be a non-empty string");
  });

  it("returns 400 when title is whitespace only", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "   ", targetValue: 10 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("title must be a non-empty string");
  });

  it("returns 400 when title is empty after HTML stripping", async () => {
    authedSession();
    // Title becomes empty after stripHtml + slice(0,100) — i.e. all tags
    const res = await POST(makePostRequest({ title: "<b></b>", targetValue: 10, targetDate: "2026-12-31" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("title must not be empty");
  });

  it("truncates title to 100 characters and accepts it", async () => {
    authedSession();
    supabaseMock.count.mockResolvedValue({ count: 0 });
    supabaseMock.single.mockResolvedValue({ data: { id: "1", title: "a".repeat(100) }, error: null });
    // Title is 101 chars; route strips and truncates to 100, accepts it
    const res = await POST(makePostRequest({ title: "a".repeat(101), targetValue: 10, targetDate: "2026-12-31" }));
    expect(res.status).toBe(201);
  });

  it("returns 400 when targetValue is missing", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "Test milestone" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("targetValue must be an integer between 1 and 1,000,000");
  });

  it("returns 400 when targetValue is not a number", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "Test", targetValue: "ten" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("targetValue must be an integer between 1 and 1,000,000");
  });

  it("returns 400 when targetValue is a float", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "Test", targetValue: 10.5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("targetValue must be an integer between 1 and 1,000,000");
  });

  it("returns 400 when targetValue is less than 1", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "Test", targetValue: 0 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("targetValue must be an integer between 1 and 1,000,000");
  });

  it("returns 400 when targetValue exceeds 1,000,000", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "Test", targetValue: 1_000_001 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("targetValue must be an integer between 1 and 1,000,000");
  });

  it("accepts targetValue at boundaries 1 and 1,000,000", async () => {
    authedSession();
    supabaseMock.count.mockResolvedValue({ count: 0 });
    supabaseMock.single.mockResolvedValue({ data: { id: "1" }, error: null });

    const res1 = await POST(
      makePostRequest({ title: "Min value", targetValue: 1, targetDate: "2026-12-31" })
    );
    expect(res1.status).toBe(201);

    const res2 = await POST(
      makePostRequest({ title: "Max value", targetValue: 1_000_000, targetDate: "2026-12-31" })
    );
    expect(res2.status).toBe(201);
  });

  it("returns 400 for invalid targetDate", async () => {
    authedSession();
    const res = await POST(
      makePostRequest({ title: "Test", targetValue: 10, targetDate: "not-a-date" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("targetDate must be a valid date string");
  });

  it("returns 400 for missing targetDate", async () => {
    authedSession();
    const res = await POST(makePostRequest({ title: "Test", targetValue: 10 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("targetDate must be a valid date string");
  });

  it("uses custom category when provided and valid", async () => {
    authedSession();
    supabaseMock.count.mockResolvedValue({ count: 0 });
    supabaseMock.single.mockResolvedValue({ data: { id: "1", category: "streak" }, error: null });

    const res = await POST(
      makePostRequest({
        title: "Streak milestone",
        targetValue: 30,
        targetDate: "2026-12-31",
        category: "streak",
      })
    );
    expect(res.status).toBe(201);
  });

  it("defaults category to custom when not in VALID_CATEGORIES", async () => {
    authedSession();
    supabaseMock.count.mockResolvedValue({ count: 0 });
    supabaseMock.single.mockResolvedValue({ data: { id: "1", category: "custom" }, error: null });

    const res = await POST(
      makePostRequest({
        title: "Test",
        targetValue: 10,
        targetDate: "2026-12-31",
        category: "invalid-category",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.milestone.category).toBe("custom");
  });

  it("returns 201 when user has fewer than 20 milestones", async () => {
    authedSession();
    supabaseMock.count.mockResolvedValue({ count: 0 });
    supabaseMock.single.mockResolvedValue({ data: { id: "new-milestone" }, error: null });

    const res = await POST(
      makePostRequest({ title: "New milestone", targetValue: 10, targetDate: "2026-12-31" })
    );
    expect(res.status).toBe(201);
  });

  it("returns 201 on successful creation", async () => {
    authedSession();
    supabaseMock.count.mockResolvedValue({ count: 0 });
    supabaseMock.single.mockResolvedValue({ data: { id: "42", title: "My milestone" }, error: null });

    const res = await POST(
      makePostRequest({
        title: "My milestone",
        targetValue: 100,
        targetDate: "2026-12-31",
        category: "commits",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.milestone.id).toBe("42");
  });

  it("clamps currentValue to targetValue", async () => {
    authedSession();
    supabaseMock.count.mockResolvedValue({ count: 0 });
    supabaseMock.single.mockResolvedValue({ data: { id: "1" }, error: null });

    // currentValue > targetValue should be clamped to targetValue
    const res = await POST(
      makePostRequest({
        title: "Test",
        targetValue: 10,
        currentValue: 50,
        targetDate: "2026-12-31",
      })
    );
    expect(res.status).toBe(201);
  });
});
