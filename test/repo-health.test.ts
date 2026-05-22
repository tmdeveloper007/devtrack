import { describe, it, expect } from "vitest";
import type { RepoHealthSignals } from "../src/types/repo-health";
import { computeHealthScore } from "../src/lib/repo-health";

describe("computeHealthScore", () => {
  it("returns a perfect score of 100 for optimal signals", () => {
    const signals: RepoHealthSignals = {
      commitFrequency: 10,
      prMergeRate: 1,
      avgPrOpenTimeHours: 24,
      openIssuesCount: 0,
      daysSinceLastCommit: 7,
    };
    const result = computeHealthScore("owner/repo", signals);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("green");
  });

  it("returns score of 0 for worst signals", () => {
    const signals: RepoHealthSignals = {
      commitFrequency: 0,
      prMergeRate: 0,
      avgPrOpenTimeHours: 200,
      openIssuesCount: 20,
      daysSinceLastCommit: 31,
    };
    const result = computeHealthScore("owner/repo", signals);
    expect(result.score).toBe(0);
    expect(result.grade).toBe("red");
  });

  describe("commit frequency scoring", () => {
    it("awards 25 points for 10+ commits", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 15,
        prMergeRate: 0,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(25);
    });

    it("awards ~12.5 points for 5 commits", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 5,
        prMergeRate: 0,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(13);
    });
  });

  describe("PR merge rate scoring", () => {
    it("awards 25 points for 100% merge rate", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 1,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(25);
    });

    it("awards ~12.5 points for 50% merge rate", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 0.5,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(13);
    });
  });

  describe("avg PR open time scoring", () => {
    it("awards full 20 points for <=24 hours", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 0,
        avgPrOpenTimeHours: 24,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(20);
    });

    it("awards 0 points for >=168 hours (7 days)", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 0,
        avgPrOpenTimeHours: 168,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(0);
    });
  });

  describe("open issues count scoring", () => {
    it("awards full 15 points for 0 open issues", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 0,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 0,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(15);
    });

    it("awards 0 points for 20+ open issues", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 0,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(0);
    });
  });

  describe("days since last commit scoring", () => {
    it("awards full 15 points for <=7 days", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 0,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 7,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(15);
    });

    it("awards 0 points for >=30 days", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 0,
        prMergeRate: 0,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 30,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(0);
    });
  });

  describe("gradeForScore (tested via computeHealthScore)", () => {
    it("returns green grade for score >= 70", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 10,
        prMergeRate: 1,
        avgPrOpenTimeHours: 24,
        openIssuesCount: 0,
        daysSinceLastCommit: 7,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.grade).toBe("green");
    });

    it("returns yellow grade for score 40-69", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 3,
        prMergeRate: 0.5,
        avgPrOpenTimeHours: 96,
        openIssuesCount: 10,
        daysSinceLastCommit: 14,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(70);
      expect(result.grade).toBe("yellow");
    });

    it("returns red grade for score < 40", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 1,
        prMergeRate: 0.2,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 18,
        daysSinceLastCommit: 28,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBeLessThan(40);
      expect(result.grade).toBe("red");
    });
  });

  describe("clamp (tested via computeHealthScore boundary behavior)", () => {
    it("clamps commit frequency to 0 when negative", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: -100,
        prMergeRate: 0,
        avgPrOpenTimeHours: 200,
        openIssuesCount: 20,
        daysSinceLastCommit: 31,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(0);
    });

    it("clamps score to 100 when inputs exceed maximums", () => {
      const signals: RepoHealthSignals = {
        commitFrequency: 1000,
        prMergeRate: 10,
        avgPrOpenTimeHours: 0,
        openIssuesCount: 0,
        daysSinceLastCommit: 0,
      };
      const result = computeHealthScore("owner/repo", signals);
      expect(result.score).toBe(100);
    });
  });

  it("includes the repo name in the result", () => {
    const signals: RepoHealthSignals = {
      commitFrequency: 10,
      prMergeRate: 1,
      avgPrOpenTimeHours: 24,
      openIssuesCount: 0,
      daysSinceLastCommit: 7,
    };
    const result = computeHealthScore("owner/repo", signals);
    expect(result.repo).toBe("owner/repo");
  });

  it("includes signals in the result", () => {
    const signals: RepoHealthSignals = {
      commitFrequency: 10,
      prMergeRate: 1,
      avgPrOpenTimeHours: 24,
      openIssuesCount: 0,
      daysSinceLastCommit: 7,
    };
    const result = computeHealthScore("owner/repo", signals);
    expect(result.signals).toEqual(signals);
  });
});
