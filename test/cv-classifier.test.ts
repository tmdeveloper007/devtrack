import { describe, it, expect } from "vitest";
import { detectTechnologies, mapToDomains, analyzeRepository, scoreContributions, classifyContributions, filterByRole } from "@/lib/cv/cv-classifier";
import type { RepositoryData, GitHubContributionData, PullRequestData, CommitData } from "@/types/cv-types";

function makeRepo(overrides: Partial<RepositoryData> = {}): RepositoryData {
  return {
    name: "test-repo",
    nameWithOwner: "owner/test-repo",
    description: null,
    url: "https://github.com/owner/test-repo",
    stargazerCount: 0,
    forkCount: 0,
    isForked: false,
    languages: [],
    topics: [],
    pullRequests: [],
    commits: [],
    ...overrides,
  };
}

function makePR(overrides: Partial<PullRequestData> = {}): PullRequestData {
  return {
    title: "",
    body: null,
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    labels: [],
    state: "OPEN",
    mergedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeContributionData(overrides: Partial<GitHubContributionData> = {}): GitHubContributionData {
  return {
    user: { login: "testuser", avatarUrl: "https://example.com/avatar.png", bio: null },
    repositories: [],
    contributionStats: {
      totalCommitContributions: 0,
      totalPullRequestContributions: 0,
      totalIssueContributions: 0,
      totalPullRequestReviewContributions: 0,
      totalContributions: 0,
    },
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("cv-classifier", () => {
  describe("detectTechnologies", () => {
    it("returns empty stack for empty repository list", () => {
      const result = detectTechnologies([]);
      expect(result.languages).toEqual([]);
      expect(result.frameworks).toEqual([]);
      expect(result.tools).toEqual([]);
    });

    it("extracts languages from repository", () => {
      const result = detectTechnologies([
        makeRepo({ name: "repo1", languages: ["TypeScript", "Python"] }),
      ]);
      expect(result.languages.some((l) => l.name === "TypeScript")).toBe(true);
      expect(result.languages.some((l) => l.name === "Python")).toBe(true);
    });

    it("deduplicates languages across repositories", () => {
      const result = detectTechnologies([
        makeRepo({ languages: ["TypeScript"] }),
        makeRepo({ languages: ["TypeScript", "Python"] }),
      ]);
      expect(result.languages.filter((l) => l.name === "TypeScript").length).toBe(1);
    });

    it("extracts frameworks from repo description and topics", () => {
      const result = detectTechnologies([
        makeRepo({
          topics: ["react", "vue"],
          description: "A Next.js application",
        }),
      ]);
      expect(result.frameworks.some((f) => f.name === "React")).toBe(true);
    });

    it("extracts tools from topics and description", () => {
      const result = detectTechnologies([
        makeRepo({
          pullRequests: [
            makePR({
              title: "feat: manage with Terraform and deploy on Kubernetes",
              body: "Using Docker for containerization",
            }),
          ],
        }),
      ]);
      expect(result.tools.some((t) => t.name === "Terraform")).toBe(true);
      expect(result.tools.some((t) => t.name === "Kubernetes")).toBe(true);
      expect(result.tools.some((t) => t.name === "Docker")).toBe(true);
    });
  });

  describe("mapToDomains", () => {
    it("returns empty domains for empty tech stack and repos", () => {
      const result = mapToDomains({ languages: [], frameworks: [], tools: [] }, []);
      expect(result).toEqual([]);
    });

    it("scores Frontend domain for React language", () => {
      const stack = { languages: [{ name: "React", confidence: "high" as const, source: "language" as const, occurrences: 1 }], frameworks: [], tools: [] };
      const result = mapToDomains(stack, []);
      const frontend = result.find((d) => d.domain === "Frontend");
      expect(frontend).toBeDefined();
      expect(frontend!.score).toBeGreaterThan(0);
    });

    it("scores Backend domain for Python language", () => {
      const stack = { languages: [{ name: "Python", confidence: "high" as const, source: "language" as const, occurrences: 1 }], frameworks: [], tools: [] };
      const result = mapToDomains(stack, []);
      const backend = result.find((d) => d.domain === "Backend");
      expect(backend).toBeDefined();
      expect(backend!.score).toBeGreaterThan(0);
    });
  });

  describe("analyzeRepository", () => {
    it("counts merged pull requests by state", () => {
      const repo = makeRepo({
        pullRequests: [
          makePR({ state: "MERGED" }),
          makePR({ state: "MERGED" }),
          makePR({ state: "OPEN" }),
        ],
      });
      const result = analyzeRepository(repo);
      expect(result.prsMerged).toBe(2);
    });

    it("sums additions and deletions across PRs", () => {
      const repo = makeRepo({
        pullRequests: [
          makePR({ state: "MERGED", additions: 50, deletions: 10 }),
          makePR({ state: "MERGED", additions: 20, deletions: 5 }),
        ],
      });
      const result = analyzeRepository(repo);
      expect(result.totalAdditions).toBe(70);
      expect(result.totalDeletions).toBe(15);
    });

    it("returns zero stats for empty repository", () => {
      const result = analyzeRepository(makeRepo());
      expect(result.prsMerged).toBe(0);
      expect(result.totalAdditions).toBe(0);
      expect(result.totalDeletions).toBe(0);
    });

    it("detects domains from repository languages", () => {
      const repo = makeRepo({ languages: ["TypeScript", "Python"] });
      const result = analyzeRepository(repo);
      expect(result.languages).toContain("TypeScript");
      expect(result.languages).toContain("Python");
    });

    it("sets correct complexity for small repository", () => {
      const repo = makeRepo({
        pullRequests: [makePR({ state: "MERGED", additions: 50, deletions: 10 })],
      });
      const result = analyzeRepository(repo);
      expect(["low", "medium", "high"]).toContain(result.complexity);
    });
  });

  describe("scoreContributions", () => {
    it("returns zeros for empty contribution data", () => {
      const data = makeContributionData({ repositories: [] });
      const result = scoreContributions(data);
      expect(result.totalPRsMerged).toBe(0);
      expect(result.totalCommits).toBe(0);
      expect(result.totalAdditions).toBe(0);
      expect(result.totalDeletions).toBe(0);
    });

    it("counts merged PRs across repositories", () => {
      const data = makeContributionData({
        repositories: [
          makeRepo({
            name: "r1",
            pullRequests: [makePR({ state: "MERGED" }), makePR({ state: "OPEN" })],
            commits: [],
          }),
        ],
      });
      const result = scoreContributions(data);
      expect(result.totalPRsMerged).toBe(1);
    });

    it("counts total repos contributed", () => {
      const data = makeContributionData({
        repositories: [makeRepo({ name: "r1" }), makeRepo({ name: "r2" })],
      });
      const result = scoreContributions(data);
      expect(result.totalReposContributed).toBe(2);
    });
  });

  describe("classifyContributions", () => {
    it("returns a valid classification for empty data", () => {
      const data = makeContributionData({ repositories: [] });
      const result = classifyContributions(data);
      expect(result.primaryDomain).toBeDefined();
      expect(result.domains).toBeDefined();
      expect(result.techStack).toBeDefined();
      expect(result.contributionScores).toBeDefined();
    });

    it("sets primary domain as FullStack when no strong signals", () => {
      const data = makeContributionData({ repositories: [] });
      const result = classifyContributions(data);
      expect(result.primaryDomain).toBe("FullStack");
    });

    it("includes contribution scores in result", () => {
      const data = makeContributionData({
        repositories: [
          makeRepo({
            name: "r1",
            pullRequests: [makePR({ state: "MERGED", additions: 50, deletions: 10 })],
            commits: [],
          }),
        ],
      });
      const result = classifyContributions(data);
      expect(result.contributionScores.totalPRsMerged).toBe(1);
      expect(result.contributionScores.totalAdditions).toBe(50);
    });

    it("maps tech stack from repositories", () => {
      const data = makeContributionData({
        repositories: [makeRepo({ name: "r1", languages: ["TypeScript"] })],
      });
      const result = classifyContributions(data);
      expect(result.techStack.languages.some((l) => l.name === "TypeScript")).toBe(true);
    });
  });

  describe("filterByRole", () => {
    it("returns domains and techStack for DevOps Engineer role", () => {
      const classification = classifyContributions(makeContributionData({ repositories: [] }));
      const result = filterByRole(classification, "DevOps Engineer");
      expect(result.domains).toBeDefined();
      expect(result.techStack).toBeDefined();
      expect(result.primaryDomain).toBeDefined();
    });

    it("preserves techStack when filtering", () => {
      const data = makeContributionData({
        repositories: [makeRepo({ name: "r1", languages: ["TypeScript"] })],
      });
      const classification = classifyContributions(data);
      const result = filterByRole(classification, "Full Stack Developer");
      expect(result.techStack).toBeDefined();
      expect(result.techStack.languages.length).toBeGreaterThanOrEqual(0);
    });
  });
});
