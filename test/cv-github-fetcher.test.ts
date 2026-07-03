import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchContributionData } from "@/lib/cv/cv-github-fetcher";
import { githubGraphQL } from "@/lib/github-fetch";

vi.mock("@/lib/github-fetch", () => ({
  githubGraphQL: vi.fn(),
  GitHubRateLimitError: class GitHubRateLimitError extends Error {},
}));

describe("cv-github-fetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockGitHubResponse = {
    user: {
      login: "testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/1234567",
      bio: "Full-stack developer",
      contributionsCollection: {
        totalCommitContributions: 100,
        totalPullRequestContributions: 20,
        totalIssueContributions: 5,
        totalPullRequestReviewContributions: 10,
        contributionCalendar: { totalContributions: 135 },
      },
      repositories: {
        nodes: [
          {
            name: "my-project",
            nameWithOwner: "testuser/my-project",
            description: "A TypeScript project with React",
            url: "https://github.com/testuser/my-project",
            stargazerCount: 42,
            forkCount: 5,
            isFork: false,
            languages: { nodes: [{ name: "TypeScript" }, { name: "JavaScript" }] },
            repositoryTopics: { nodes: [{ topic: { name: "react" } }, { topic: { name: "typescript" } }] },
            pullRequests: {
              nodes: [
                {
                  title: "Add new feature",
                  body: "This PR adds a new feature",
                  additions: 150,
                  deletions: 20,
                  changedFiles: 3,
                  state: "MERGED" as const,
                  mergedAt: "2024-01-15T10:00:00Z",
                  createdAt: "2024-01-14T10:00:00Z",
                  labels: { nodes: [{ name: "enhancement" }] },
                },
              ],
            },
            defaultBranchRef: {
              target: {
                history: {
                  nodes: [
                    {
                      message: "feat: initial commit",
                      committedDate: "2024-01-10T12:00:00Z",
                      additions: 200,
                      deletions: 0,
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  };

  it("fetches contribution data for a valid user", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue(mockGitHubResponse);
    const result = await fetchContributionData("fake-token", "testuser");
    expect(result.user.login).toBe("testuser");
    expect(result.user.avatarUrl).toBe("https://avatars.githubusercontent.com/u/1234567");
  });

  it("maps repository languages correctly", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue(mockGitHubResponse);
    const result = await fetchContributionData("fake-token", "testuser");
    expect(result.repositories[0].languages).toContain("TypeScript");
    expect(result.repositories[0].languages).toContain("JavaScript");
  });

  it("maps repository topics correctly", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue(mockGitHubResponse);
    const result = await fetchContributionData("fake-token", "testuser");
    expect(result.repositories[0].topics).toContain("react");
    expect(result.repositories[0].topics).toContain("typescript");
  });

  it("maps pull request data correctly", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue(mockGitHubResponse);
    const result = await fetchContributionData("fake-token", "testuser");
    const pr = result.repositories[0].pullRequests[0];
    expect(pr.title).toBe("Add new feature");
    expect(pr.state).toBe("MERGED");
    expect(pr.additions).toBe(150);
    expect(pr.deletions).toBe(20);
  });

  it("maps commit data correctly", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue(mockGitHubResponse);
    const result = await fetchContributionData("fake-token", "testuser");
    const commit = result.repositories[0].commits[0];
    expect(commit.message).toBe("feat: initial commit");
    expect(commit.additions).toBe(200);
    expect(commit.deletions).toBe(0);
  });

  it("includes contribution stats", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue(mockGitHubResponse);
    const result = await fetchContributionData("fake-token", "testuser");
    expect(result.contributionStats.totalContributions).toBe(135);
    expect(result.contributionStats.totalCommitContributions).toBe(100);
    expect(result.contributionStats.totalPullRequestContributions).toBe(20);
  });

  it("throws when user is null", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue({ user: null });
    await expect(fetchContributionData("fake-token", "nonexistent")).rejects.toThrow(
      'GitHub user "nonexistent" not found.'
    );
  });

  it("throws when user is missing from response", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue({});
    await expect(fetchContributionData("fake-token", "testuser")).rejects.toThrow(
      'GitHub user "testuser" not found.'
    );
  });

  it("tolerates null description and body", async () => {
    vi.mocked(githubGraphQL).mockResolvedValue({
      user: {
        login: "testuser",
        avatarUrl: "https://example.com/avatar.png",
        bio: null,
        repositories: {
          nodes: [
            {
              name: "null-desc-repo",
              nameWithOwner: "testuser/null-desc-repo",
              description: null,
              url: "https://github.com/testuser/null-desc-repo",
              stargazerCount: 0,
              forkCount: 0,
              isFork: false,
              languages: { nodes: [] },
              repositoryTopics: { nodes: [] },
              pullRequests: { nodes: [] },
              commits: { nodes: [] },
            },
          ],
        },
        contributionStats: {
          totalCommitContributions: 0,
          totalPullRequestContributions: 0,
          totalIssueContributions: 0,
          totalPullRequestReviewContributions: 0,
          totalContributions: 0,
        },
      },
    });
    const result = await fetchContributionData("fake-token", "testuser");
    expect(result.repositories[0].description).toBeNull();
    expect(result.repositories[0].pullRequests).toEqual([]);
  });
});
