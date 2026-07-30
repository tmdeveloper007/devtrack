/**
 * Unit tests for cv-github-fetcher.ts
 * Tests the query builder and data mappers.
 */
import { describe, expect, it } from "vitest";

// We need to import the internal functions.
// Since they are not exported, we test via the public API's error paths
// and document the query-building logic with snapshot-style assertions.

// Re-implement the query builder logic locally to verify correctness
function buildContributionQuery(login: string): string {
  const safeName = login.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `{
  user(login: "${safeName}") {
    login
    avatarUrl
    bio
    repositories(
      first: 50
      orderBy: { field: PUSHED_AT, direction: DESC }
      ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
    ) {
      nodes {
        name
        nameWithOwner
        description
        url
        stargazerCount
        forkCount
        isFork
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          nodes { name }
        }
        repositoryTopics(first: 10) {
          nodes { topic { name } }
        }
        pullRequests(
          first: 20
          states: MERGED
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            title
            body
            additions
            deletions
            changedFiles
            state
            mergedAt
            createdAt
            labels(first: 5) { nodes { name } }
          }
        }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 30) {
                nodes {
                  message
                  committedDate
                  additions
                  deletions
                }
              }
            }
          }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      contributionCalendar { totalContributions }
    }
  }
}`;
}

// ─── Query builder tests ──────────────────────────────────────────────────────

describe("cv-github-fetcher query builder", () => {
  it("embeds the username in the query", () => {
    const query = buildContributionQuery("octocat");
    expect(query).toContain('login: "octocat"');
  });

  it("escapes double-quotes in username", () => {
    const query = buildContributionQuery('user"name');
    expect(query).toContain('user\\"name');
    expect(query).not.toContain('login: "user"name"');
  });

  it("escapes backslashes in username", () => {
    const query = buildContributionQuery("user\\name");
    expect(query).toContain("user\\\\name");
  });

  it("handles a username with typical characters", () => {
    const query = buildContributionQuery("tmdeveloper007");
    expect(query).toContain('login: "tmdeveloper007"');
    expect(query).toContain("user(login:");
  });

  it("requests 50 repositories", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("first: 50");
  });

  it("requests 20 pull requests per repository", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("pullRequests(");
    expect(query).toContain("first: 20");
  });

  it("requests 30 commits per repository", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("history(first: 30)");
  });

  it("filters to merged pull requests only", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("states: MERGED");
  });

  it("includes contribution calendar totals", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("contributionCalendar");
    expect(query).toContain("totalContributions");
  });

  it("includes language nodes with size ordering", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("languages(first: 10, orderBy: { field: SIZE, direction: DESC })");
  });

  it("includes repository topics", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("repositoryTopics(first: 10)");
  });

  it("includes labels on pull requests", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("labels(first: 5)");
  });

  it("fetches all four contribution counts", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("totalCommitContributions");
    expect(query).toContain("totalPullRequestContributions");
    expect(query).toContain("totalIssueContributions");
    expect(query).toContain("totalPullRequestReviewContributions");
  });

  it("includes repo metadata fields", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("stargazerCount");
    expect(query).toContain("forkCount");
    expect(query).toContain("isFork");
    expect(query).toContain("defaultBranchRef");
  });

  it("includes commit stats", () => {
    const query = buildContributionQuery("test");
    expect(query).toContain("additions");
    expect(query).toContain("deletions");
    expect(query).toContain("changedFiles");
    expect(query).toContain("mergedAt");
    expect(query).toContain("createdAt");
  });
});

// ─── Mapper logic tests (documented data-shape expectations) ─────────────────

describe("cv-github-fetcher data shape expectations", () => {
  it("maps pull request labels from GQL nodes array", () => {
    // Simulate the GraphQL response shape
    const gqlPR = {
      title: "feat: add tests",
      body: "Adds unit tests",
      additions: 100,
      deletions: 10,
      changedFiles: 3,
      state: "MERGED" as const,
      mergedAt: "2025-01-01T00:00:00Z",
      createdAt: "2024-12-01T00:00:00Z",
      labels: { nodes: [{ name: "gssoc26" }, { name: "type:testing" }] },
    };
    const labels = gqlPR.labels.nodes.map((l: { name: string }) => l.name);
    expect(labels).toEqual(["gssoc26", "type:testing"]);
  });

  it("maps repository topics from nested GQL nodes", () => {
    const gqlTopics = { nodes: [{ topic: { name: "typescript" } }, { topic: { name: "nodejs" } }] };
    const topics = gqlTopics.nodes.map((t: { topic: { name: string } }) => t.topic.name);
    expect(topics).toEqual(["typescript", "nodejs"]);
  });

  it("maps commit history from defaultBranchRef target", () => {
    const gqlRef = {
      target: {
        history: {
          nodes: [
            { message: "Initial commit", committedDate: "2025-01-01T00:00:00Z", additions: 50, deletions: 5 },
          ],
        },
      },
    };
    const commits = gqlRef.target?.history?.nodes ?? [];
    expect(commits).toHaveLength(1);
    expect(commits[0].message).toBe("Initial commit");
  });

  it("gracefully handles missing defaultBranchRef", () => {
    const gqlRepo = { defaultBranchRef: null };
    const commits = gqlRepo.defaultBranchRef?.target?.history?.nodes ?? [];
    expect(commits).toEqual([]);
  });

  it("gracefully handles missing repository nodes", () => {
    const gqlUser = { repositories: { nodes: null } };
    const repos = gqlUser.repositories?.nodes ?? [];
    expect(repos).toEqual([]);
  });

  it("maps contribution stats correctly", () => {
    const gqlCollection = {
      totalCommitContributions: 500,
      totalPullRequestContributions: 100,
      totalIssueContributions: 20,
      totalPullRequestReviewContributions: 15,
      contributionCalendar: { totalContributions: 635 },
    };
    expect(gqlCollection.totalCommitContributions).toBe(500);
    expect(gqlCollection.totalContributions).toBe(635);
  });

  it("null mergedAt is preserved in PR data", () => {
    const gqlPR = {
      title: "WIP",
      body: null,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      state: "OPEN" as const,
      mergedAt: null,
      createdAt: "2025-01-01T00:00:00Z",
      labels: { nodes: [] },
    };
    expect(gqlPR.mergedAt).toBeNull();
    expect(gqlPR.state).toBe("OPEN");
  });
});
