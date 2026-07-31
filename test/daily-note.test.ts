import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/daily-note/route";
import { NextRequest } from "next/server";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const supabaseAdmin: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  return {
    getServerSession: vi.fn(),
    resolveAppUser: vi.fn(),
    supabaseAdmin,
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

// ─── helpers ────────────────────────────────────────────────────────────────

function makePostRequest(note: string): NextRequest {
  return new NextRequest("http://localhost/api/daily-note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
}

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/daily-note", {
    method: "GET",
  });
}

function authedSession() {
  mocks.getServerSession.mockResolvedValue({
    githubId: "12345",
    githubLogin: "testuser",
    accessToken: "gh-token",
  });
  mocks.resolveAppUser.mockResolvedValue({ id: "uid1" });
}

function resetAll() {
  vi.clearAllMocks();
  // Reset each method — keep implementations via mockReturnThis
  mocks.getServerSession.mockReset();
  mocks.resolveAppUser.mockReset();
  mocks.supabaseAdmin.from.mockReset();
  mocks.supabaseAdmin.select.mockReset();
  mocks.supabaseAdmin.eq.mockReset();
  mocks.supabaseAdmin.upsert.mockReset();
  mocks.supabaseAdmin.single.mockReset();
  mocks.supabaseAdmin.from.mockReturnThis();
  mocks.supabaseAdmin.select.mockReturnThis();
  mocks.supabaseAdmin.eq.mockReturnThis();
  mocks.supabaseAdmin.upsert.mockReturnThis();
}

describe("GET /api/daily-note", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns 401 when not authenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no githubId", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: null });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when resolveAppUser returns null", async () => {
    mocks.getServerSession.mockResolvedValue({ githubId: "12345", githubLogin: "user" });
    mocks.resolveAppUser.mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns today and yesterday notes for authenticated user", async () => {
    authedSession();

    let noteIdx = 0;
    const notes = [
      { id: "1", note: "Today note text" },
      { id: "2", note: "Yesterday note text" },
    ];

    mocks.supabaseAdmin.single.mockImplementation(() => {
      const data = notes[noteIdx++];
      return Promise.resolve({ data, error: null });
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.todayNote).toBe("Today note text");
    expect(body.yesterdayNote).toBe("Yesterday note text");
  });

  it("returns empty strings when no notes exist", async () => {
    authedSession();

    mocks.supabaseAdmin.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.todayNote).toBe("");
    expect(body.yesterdayNote).toBe("");
  });

  it("returns 500 on database error other than PGRST116", async () => {
    authedSession();

    mocks.supabaseAdmin.single.mockResolvedValue({
      data: null,
      error: { code: "ERR_DB" },
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/daily-note", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns 401 when not authenticated", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest("Hello world"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when note is empty", async () => {
    authedSession();
    const res = await POST(makePostRequest(""));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Note cannot be empty");
  });

  it("returns 400 when note is whitespace only", async () => {
    authedSession();
    const res = await POST(makePostRequest("   \n\t  "));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Note cannot be empty");
  });

  it("returns 400 when note exceeds 280 characters", async () => {
    authedSession();
    const res = await POST(makePostRequest("a".repeat(281)));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Maximum 280 characters allowed");
  });

  it("returns 200 when note is exactly 280 characters", async () => {
    authedSession();
    mocks.supabaseAdmin.single.mockResolvedValue({
      data: { id: "1", note: "a".repeat(280) },
      error: null,
    });

    const res = await POST(makePostRequest("a".repeat(280)));
    expect(res.status).toBe(200);
  });

  it("trims note before saving", async () => {
    authedSession();
    mocks.supabaseAdmin.single.mockResolvedValue({
      data: { id: "1", note: "trimmed note" },
      error: null,
    });

    const res = await POST(makePostRequest("  trimmed note  "));
    expect(res.status).toBe(200);
  });

  it("returns 500 on database error", async () => {
    authedSession();
    mocks.supabaseAdmin.single.mockRejectedValue(new Error("DB error"));

    const res = await POST(makePostRequest("Hello world"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Something went wrong");
  });
});
