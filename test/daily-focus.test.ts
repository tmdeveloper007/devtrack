import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "@/app/api/daily-focus/route";
import { NextRequest } from "next/server";

// ChainablePromise: works as both an awaitable Promise AND a chainable object
class ChainablePromise<T> extends Promise<T> {
  eq!: (a: string, b: string) => ChainablePromise<any>;
  constructor(executor: (resolve: (v: T) => void) => void) {
    super(executor);
    // eq will be overridden by the factory function
    (this as any).eq = vi.fn().mockImplementation((_a: string, _b: string) => this);
  }
}

function makeChainableDelete<T>(resolvedValue: T): any {
  return new ChainablePromise<T>(resolve => resolve(resolvedValue));
}

const mocks = vi.hoisted(() => {
  return {
    getServerSession: vi.fn(),
    resolveAppUser: vi.fn(),
    supabaseAdmin: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn(),
    },
  };
});

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mocks.resolveAppUser,
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

function resetAll() {
  vi.clearAllMocks();
  mocks.supabaseAdmin.from.mockReset();
  mocks.supabaseAdmin.select.mockReset();
  mocks.supabaseAdmin.eq.mockReset();
  mocks.supabaseAdmin.upsert.mockReset();
  mocks.supabaseAdmin.delete.mockReset();
  mocks.supabaseAdmin.single.mockReset();
  mocks.supabaseAdmin.from.mockReturnThis();
  mocks.supabaseAdmin.select.mockReturnThis();
  mocks.supabaseAdmin.eq.mockReturnThis();
  mocks.supabaseAdmin.upsert.mockReturnThis();
  mocks.supabaseAdmin.delete.mockReturnThis();
}

function makeGetRequest(date?: string): NextRequest {
  const url = date
    ? `http://localhost/api/daily-focus?date=${date}`
    : "http://localhost/api/daily-focus";
  return new NextRequest(url);
}

function makePostRequest(body: object): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

function makeDeleteRequest(date: string): NextRequest {
  return new NextRequest(`http://localhost/api/daily-focus?date=${date}`);
}

// ─── GET tests ───────────────────────────────────────────────────────────────

describe("GET /api/daily-focus", () => {
  beforeEach(resetAll);

  it("returns 401 when session is null", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no githubId", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found in DB", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(404);
  });

  it("returns goal_text from DB when found", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    mocks.supabaseAdmin.single.mockResolvedValue({
      data: { goal_text: "Write 100 lines" },
      error: null,
    });
    const res = await GET(makeGetRequest("2025-01-01"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.goal).toBe("Write 100 lines");
  });

  it("returns empty goal when DB returns no data", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    mocks.supabaseAdmin.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    });
    const res = await GET(makeGetRequest("2025-01-01"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.goal).toBe("");
  });

  it("queries with correct user_id and date", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    mocks.supabaseAdmin.single.mockResolvedValue({ data: null, error: null });
    await GET(makeGetRequest("2025-07-01"));
    expect(mocks.supabaseAdmin.eq).toHaveBeenCalledWith("user_id", "uid-1");
    expect(mocks.supabaseAdmin.eq).toHaveBeenCalledWith("date", "2025-07-01");
  });

  it("returns 500 when DB query throws", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    mocks.supabaseAdmin.single.mockRejectedValue(new Error("DB error"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

// ─── POST tests ──────────────────────────────────────────────────────────────

describe("POST /api/daily-focus", () => {
  beforeEach(resetAll);

  it("returns 401 when not authenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest({ goal_text: "Test", date: "2025-01-01" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue(null);
    const res = await POST(makePostRequest({ goal_text: "Test", date: "2025-01-01" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when goal_text is empty", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    const res = await POST(makePostRequest({ goal_text: "   ", date: "2025-01-01" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Goal cannot be empty");
  });

  it("returns 400 when goal_text is missing", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    const res = await POST(makePostRequest({ date: "2025-01-01" }));
    expect(res.status).toBe(400);
  });

  it("upserts goal and returns data on success", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    const savedData = { user_id: "uid-1", date: "2025-01-01", goal_text: "Write tests" };
    mocks.supabaseAdmin.upsert.mockReturnThis();
    mocks.supabaseAdmin.select.mockReturnThis();
    mocks.supabaseAdmin.single.mockResolvedValue({ data: savedData, error: null });
    const res = await POST(makePostRequest({ goal_text: "Write tests", date: "2025-01-01" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.goal_text).toBe("Write tests");
  });

  it("returns 500 when upsert fails", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    mocks.supabaseAdmin.upsert.mockReturnThis();
    mocks.supabaseAdmin.select.mockReturnThis();
    mocks.supabaseAdmin.single.mockRejectedValue(new Error("DB error"));
    const res = await POST(makePostRequest({ goal_text: "Test", date: "2025-01-01" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    mocks.getServerSession.mockRejectedValue(new Error("Unexpected"));
    const res = await POST(makePostRequest({ goal_text: "Test", date: "2025-01-01" }));
    expect(res.status).toBe(500);
  });
});

// ─── DELETE tests ────────────────────────────────────────────────────────────

describe("DELETE /api/daily-focus", () => {
  beforeEach(resetAll);

  it("returns 401 when not authenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest("2025-01-01"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest("2025-01-01"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when date is missing", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    const req = new NextRequest("http://localhost/api/daily-focus");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Date is required");
  });

  it("deletes with correct user_id and date", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    const deleteEq = vi.fn().mockReturnThis();
    const deleteObj = { delete: vi.fn().mockReturnThis(), eq: deleteEq };
    mocks.supabaseAdmin.from.mockReturnValue(deleteObj);
    await DELETE(makeDeleteRequest("2025-07-01"));
    expect(deleteEq).toHaveBeenCalledWith("user_id", "uid-1");
    expect(deleteEq).toHaveBeenCalledWith("date", "2025-07-01");
  });

  it("returns 500 when delete fails", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    // Replace from() to return an object where delete() is a custom async function
    const deleteObj = {
      delete: vi.fn().mockImplementation(async () => ({ error: { message: "DB error" } })),
      eq: vi.fn().mockReturnThis(),
    };
    mocks.supabaseAdmin.from.mockReturnValue(deleteObj);
    const res = await DELETE(makeDeleteRequest("2025-01-01"));
    expect(res.status).toBe(500);
  });

  it("returns success on successful delete", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "uid-1" });
    const chainObj = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    mocks.supabaseAdmin.from.mockReturnValue(chainObj);
    // Replace delete() with a ChainablePromise that resolves to { error: null }
    chainObj.delete = vi.fn(() => new ChainablePromise<{ error: null }>(resolve => resolve({ error: null })));
    const res = await DELETE(makeDeleteRequest("2025-01-01"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
