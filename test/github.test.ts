import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchUserEvents, fetchUserRepos, fetchIssuesMetrics } from "../src/lib/github";

describe("fetchUserEvents", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches user events successfully", async () => {
    const mockEvents = [
      { id: "1", type: "PushEvent", created_at: "2024-01-01T00:00:00Z", repo: { name: "test/repo" } },
      { id: "2", type: "IssueEvent", created_at: "2024-01-02T00:00:00Z", repo: { name: "test/repo2" } },
    ];
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEvents),
      })
    );
    global.fetch = mockFetch;

    const result = await fetchUserEvents("test-token");
    expect(result).toEqual(mockEvents);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/user/events?per_page=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("throws error when response is not ok", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      })
    );
    global.fetch = mockFetch;

    await expect(fetchUserEvents("bad-token")).rejects.toThrow("GitHub API error: 401");
  });

  it("throws error when fetch fails", async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error("Network error")));
    global.fetch = mockFetch;

    await expect(fetchUserEvents("test-token")).rejects.toThrow("Network error");
  });
});

describe("fetchUserRepos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches user repos successfully", async () => {
    const mockRepos = [
      { id: 1, name: "repo1", full_name: "user/repo1", open_issues_count: 5, stargazers_count: 100, pushed_at: "2024-01-01T00:00:00Z" },
      { id: 2, name: "repo2", full_name: "user/repo2", open_issues_count: 3, stargazers_count: 50, pushed_at: "2024-01-02T00:00:00Z" },
    ];
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockRepos),
      })
    );
    global.fetch = mockFetch;

    const result = await fetchUserRepos("test-token");
    expect(result).toEqual(mockRepos);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/user/repos?sort=pushed&per_page=10",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("throws error when response is not ok", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
      })
    );
    global.fetch = mockFetch;

    await expect(fetchUserRepos("bad-token")).rejects.toThrow("GitHub API error: 403");
  });
});

describe("fetchIssuesMetrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns correct metrics structure", async () => {
    const mockIssues = [
      { state: "open", created_at: "2024-01-01T00:00:00Z", closed_at: null, repository_url: "https://api.github.com/repos/user/repo1" },
      { state: "closed", created_at: "2024-01-02T00:00:00Z", closed_at: "2024-01-05T00:00:00Z", repository_url: "https://api.github.com/repos/user/repo1" },
      { state: "open", created_at: "2024-01-03T00:00:00Z", closed_at: null, repository_url: "https://api.github.com/repos/user/repo2" },
      { state: "closed", created_at: "2024-01-01T00:00:00Z", closed_at: "2024-01-03T00:00:00Z", repository_url: "https://api.github.com/repos/user/repo2" },
    ];

    let callCount = 0;
    const mockFetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockIssues }),
        });
      }
      if (callCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_count: 10 }),
        });
      }
      if (callCount === 3) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_count: 8 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      });
    });
    global.fetch = mockFetch;

    const result = await fetchIssuesMetrics("test-token");

    expect(result).toHaveProperty("opened");
    expect(result).toHaveProperty("closed");
    expect(result).toHaveProperty("currentlyOpen");
    expect(result).toHaveProperty("avgCloseTimeDays");
    expect(result).toHaveProperty("trend");
    expect(result).toHaveProperty("mostActiveRepo");
  });

  it("throws error when search request fails", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
      })
    );
    global.fetch = mockFetch;

    await expect(fetchIssuesMetrics("bad-token")).rejects.toThrow("GitHub API error: 403");
  });

  it("calculates most active repo correctly", async () => {
    const mockIssues = [
      { state: "open", created_at: "2024-01-01T00:00:00Z", closed_at: null, repository_url: "https://api.github.com/repos/user/repo1" },
      { state: "open", created_at: "2024-01-01T00:00:00Z", closed_at: null, repository_url: "https://api.github.com/repos/user/repo1" },
      { state: "open", created_at: "2024-01-01T00:00:00Z", closed_at: null, repository_url: "https://api.github.com/repos/user/repo2" },
    ];

    let callCount = 0;
    const mockFetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockIssues }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ total_count: 3 }),
      });
    });
    global.fetch = mockFetch;

    const result = await fetchIssuesMetrics("test-token");
    expect(result.mostActiveRepo).toBe("repo1");
  });
});
