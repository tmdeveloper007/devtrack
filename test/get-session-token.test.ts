import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockResolveAppUser = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mockResolveAppUser,
}));

import { getSessionWithToken } from "@/lib/get-session-token";

describe("getSessionWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no session exists", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when session has no githubId", async () => {
    mockGetServerSession.mockResolvedValue({
      githubId: undefined,
      githubLogin: "octocat",
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when session has no githubLogin", async () => {
    mockGetServerSession.mockResolvedValue({
      githubId: "123",
      githubLogin: undefined,
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when accessToken is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      githubId: "123",
      githubLogin: "octocat",
      accessToken: undefined,
    });

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns null when resolveAppUser returns null", async () => {
    mockGetServerSession.mockResolvedValue({
      githubId: "123",
      githubLogin: "octocat",
      accessToken: "ghp_test_token",
    });
    mockResolveAppUser.mockResolvedValue(null);

    const result = await getSessionWithToken();
    expect(result).toBeNull();
  });

  it("returns session and token when all checks pass", async () => {
    const mockSession = {
      githubId: "123",
      githubLogin: "octocat",
      accessToken: "ghp_valid_token",
    };
    const mockUserRow = { id: "123", github_login: "octocat" };

    mockGetServerSession.mockResolvedValue(mockSession);
    mockResolveAppUser.mockResolvedValue(mockUserRow);

    const result = await getSessionWithToken();

    expect(result).not.toBeNull();
    expect(result!.session).toEqual(mockSession);
    expect(result!.accessToken).toBe("ghp_valid_token");
  });

  it("calls resolveAppUser with correct arguments", async () => {
    mockGetServerSession.mockResolvedValue({
      githubId: "456",
      githubLogin: "defunkt",
      accessToken: "ghp_another_token",
    });
    mockResolveAppUser.mockResolvedValue({ id: "456", github_login: "defunkt" });

    await getSessionWithToken();

    expect(mockResolveAppUser).toHaveBeenCalledWith("456", "defunkt");
  });
});
