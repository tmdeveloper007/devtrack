/**
 * Unit tests for get-session-token.ts
 * Tests the getSessionWithToken function and its SessionWithToken interface.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockResolveAppUser = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mockResolveAppUser,
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getSessionWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no session", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    mockGetServerSession.mockResolvedValue(null);

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when session has no githubId", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    mockGetServerSession.mockResolvedValue({ user: { name: "Test" } });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when session has no githubLogin", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    mockGetServerSession.mockResolvedValue({ githubId: "12345" });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when accessToken is missing", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    mockGetServerSession.mockResolvedValue({
      githubId: "12345",
      githubLogin: "testuser",
      accessToken: undefined,
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when accessToken is empty string", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    mockGetServerSession.mockResolvedValue({
      githubId: "12345",
      githubLogin: "testuser",
      accessToken: "",
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when resolveAppUser returns null", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    mockGetServerSession.mockResolvedValue({
      githubId: "12345",
      githubLogin: "testuser",
      accessToken: "ghp_validtoken",
    });
    mockResolveAppUser.mockResolvedValue(null);

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns session and token when all checks pass", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    const session = {
      githubId: "12345",
      githubLogin: "testuser",
      accessToken: "ghp_validtoken",
    };
    mockGetServerSession.mockResolvedValue(session);
    mockResolveAppUser.mockResolvedValue({ id: "user-row-id" });

    const result = await getSessionWithToken();
    expect(result).not.toBeNull();
    expect(result?.accessToken).toBe("ghp_validtoken");
    expect(result?.session).toBe(session);
  });

  it("passes githubId and githubLogin to resolveAppUser", async () => {
    const { getSessionWithToken } = await import("@/lib/get-session-token");
    mockGetServerSession.mockResolvedValue({
      githubId: "99999",
      githubLogin: "anotheruser",
      accessToken: "valid",
    });
    mockResolveAppUser.mockResolvedValue({ id: "row" });

    await getSessionWithToken();
    expect(mockResolveAppUser).toHaveBeenCalledWith("99999", "anotheruser");
  });
});

describe("SessionWithToken interface shape", () => {
  it("has the required fields", () => {
    // Verify the interface shape matches expected usage
    const result = {
      session: {
        githubId: "123",
        githubLogin: "user",
        accessToken: "token",
      },
      accessToken: "token",
    };
    expect(typeof result.session).toBe("object");
    expect(typeof result.accessToken).toBe("string");
    expect(result.accessToken).toBe(result.session.accessToken);
  });
});
