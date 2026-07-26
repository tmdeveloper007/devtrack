import { describe, expect, it } from "vitest";
import {
  buildPublicGoalSharePath,
  buildPublicGoalShareUrl,
  getGoalProgressPercent,
} from "@/lib/goals/share";

describe("goal sharing helpers", () => {
  it("builds the public goal path", () => {
    expect(buildPublicGoalSharePath("octocat", "goal-123")).toBe(
      "/u/octocat/goals/goal-123"
    );
  });

  it("encodes username and goal id safely", () => {
    expect(buildPublicGoalSharePath("octo cat", "goal/123")).toBe(
      "/u/octo%20cat/goals/goal%2F123"
    );
  });

  it("builds the full public goal URL", () => {
    expect(
      buildPublicGoalShareUrl("http://localhost:3000", "octocat", "goal-123")
    ).toBe("http://localhost:3000/u/octocat/goals/goal-123");
  });

  it("calculates clamped goal progress percentage", () => {
    expect(getGoalProgressPercent(40, 100)).toBe(40);
    expect(getGoalProgressPercent(120, 100)).toBe(100);
    expect(getGoalProgressPercent(-10, 100)).toBe(0);
    expect(getGoalProgressPercent(10, 0)).toBe(0);
  });

  describe("getGoalProgressPercent edge cases", () => {
    it("returns 0 for NaN current", () => {
      expect(getGoalProgressPercent(NaN, 100)).toBe(0);
    });

    it("returns 0 for NaN target", () => {
      expect(getGoalProgressPercent(50, NaN)).toBe(0);
    });

    it("returns 100 for Infinity current", () => {
      expect(getGoalProgressPercent(Infinity, 100)).toBe(100);
    });

    it("returns 0 for negative infinity current", () => {
      expect(getGoalProgressPercent(-Infinity, 100)).toBe(0);
    });

    it("returns 0 for Infinity target", () => {
      expect(getGoalProgressPercent(50, Infinity)).toBe(0);
    });

    it("returns 100 for very large numbers", () => {
      expect(getGoalProgressPercent(1e15, 1e15)).toBe(100);
    });

    it("returns 0 when current is zero", () => {
      expect(getGoalProgressPercent(0, 100)).toBe(0);
    });

    it("returns 0 when current is negative", () => {
      expect(getGoalProgressPercent(-50, 100)).toBe(0);
    });

    it("returns 100 when current equals target exactly", () => {
      expect(getGoalProgressPercent(50, 50)).toBe(100);
    });

    it("returns 0 when target is negative", () => {
      expect(getGoalProgressPercent(50, -10)).toBe(0);
    });
  });

  describe("buildPublicGoalShareUrl edge cases", () => {
    it("handles origin with trailing slash without double-slash", () => {
      // Trailing slash on origin would produce "//u/" without normalisation
      expect(buildPublicGoalShareUrl("http://example.com/", "octocat", "goal-123"))
        .toBe("http://example.com/u/octocat/goals/goal-123");
    });

    it("handles empty username", () => {
      const result = buildPublicGoalShareUrl("http://example.com", "", "goal-123");
      expect(result).toBe("http://example.com/u//goals/goal-123");
    });

    it("handles empty goal id", () => {
      const result = buildPublicGoalShareUrl("http://example.com", "octocat", "");
      expect(result).toBe("http://example.com/u/octocat/goals/");
    });
  });

  describe("buildPublicGoalSharePath edge cases", () => {
    it("encodes CJK characters in username", () => {
      // encodeURIComponent encodes CJK as UTF-8 percent-escapes
      const result = buildPublicGoalSharePath("\u7528\u6237", "goal-123");
      expect(result).toBe("/u/%E7%94%A8%E6%88%B7/goals/goal-123");
    });

    it("encodes emoji characters in username", () => {
      const result = buildPublicGoalSharePath("user\u{1F680}", "goal-123");
      expect(result).toBe("/u/user%F0%9F%9A%80/goals/goal-123");
    });

    it("encodes question mark in goal id", () => {
      expect(buildPublicGoalSharePath("octocat", "goal?123"))
        .toBe("/u/octocat/goals/goal%3F123");
    });

    it("encodes hash in goal id", () => {
      expect(buildPublicGoalSharePath("octocat", "goal#123"))
        .toBe("/u/octocat/goals/goal%23123");
    });

    it("encodes space in goal id", () => {
      expect(buildPublicGoalSharePath("octocat", "goal 123"))
        .toBe("/u/octocat/goals/goal%20123");
    });

    it("handles empty username", () => {
      expect(buildPublicGoalSharePath("", "goal-123")).toBe("/u//goals/goal-123");
    });

    it("handles empty goal id", () => {
      expect(buildPublicGoalSharePath("octocat", "")).toBe("/u/octocat/goals/");
    });

    it("handles max-length 39-char username", () => {
      const longName = "a".repeat(39);
      const result = buildPublicGoalSharePath(longName, "goal-123");
      expect(result).toBe(`/u/${longName}/goals/goal-123`);
    });

    it("handles mixed special characters in username and goal id", () => {
      const result = buildPublicGoalSharePath("user@name/go", "goal?# space");
      expect(result).toBe("/u/user%40name%2Fgo/goals/goal%3F%23%20space");
    });
  });
});