import "./setup";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  resolveAppUser: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mocks.resolveAppUser,
}));

// ─── Imports (after mocks are set up) ───────────────────────────────────────

import { getSessionWithToken } from "../src/lib/get-session-token";

describe("getSessionWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when session is null", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when githubId is missing from session", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { name: "test", email: "test@test.com" },
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when githubLogin is missing from session", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { name: "test" },
      githubId: "12345",
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when accessToken is missing", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { name: "test" },
      githubId: "12345",
      githubLogin: "testuser",
      // accessToken is undefined
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when resolveAppUser returns null", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { name: "test" },
      githubId: "12345",
      githubLogin: "testuser",
      accessToken: "github-token-abc",
    });
    mocks.resolveAppUser.mockResolvedValue(null);

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns session and accessToken when all conditions are met", async () => {
    const mockSession = {
      user: { name: "testuser", email: "test@example.com" },
      githubId: "12345",
      githubLogin: "testuser",
      accessToken: "github-token-xyz",
    };
    const mockUser = { id: "user-abc" };

    mocks.getServerSession.mockResolvedValue(mockSession);
    mocks.resolveAppUser.mockResolvedValue(mockUser);

    const result = await getSessionWithToken();

    expect(result).not.toBeNull();
    expect(result?.accessToken).toBe("github-token-xyz");
    expect(result?.session.githubId).toBe("12345");
    expect(result?.session.githubLogin).toBe("testuser");
  });

  it("calls resolveAppUser with correct githubId and githubLogin", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { name: "test" },
      githubId: "99999",
      githubLogin: "specificuser",
      accessToken: "tok",
    });
    mocks.resolveAppUser.mockResolvedValue({ id: "user-1" });

    await getSessionWithToken();

    expect(mocks.resolveAppUser).toHaveBeenCalledWith("99999", "specificuser");
  });

  it("returns null when session user has githubId but is falsy", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { name: "test" },
      githubId: "",
      githubLogin: "testuser",
      accessToken: "tok",
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });
});
