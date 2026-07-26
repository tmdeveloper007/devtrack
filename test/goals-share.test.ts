import { describe, it, expect } from "vitest";
import { getGoalProgressPercent, buildPublicGoalSharePath, buildPublicGoalShareUrl } from "../src/lib/goals/share";

describe("getGoalProgressPercent", () => {
  it("returns 0 when current is NaN", () => {
    expect(getGoalProgressPercent(NaN, 100)).toBe(0);
  });

  it("returns 0 when current is Infinity", () => {
    expect(getGoalProgressPercent(Infinity, 100)).toBe(0);
  });

  it("returns 0 when current is negative", () => {
    expect(getGoalProgressPercent(-10, 100)).toBe(0);
  });

  it("returns 0 when target is 0", () => {
    expect(getGoalProgressPercent(50, 0)).toBe(0);
  });

  it("returns 0 when target is negative", () => {
    expect(getGoalProgressPercent(50, -10)).toBe(0);
  });

  it("returns correct percentage", () => {
    expect(getGoalProgressPercent(50, 100)).toBe(50);
    expect(getGoalProgressPercent(25, 100)).toBe(25);
    expect(getGoalProgressPercent(1, 4)).toBe(25);
  });

  it("rounds to nearest integer", () => {
    expect(getGoalProgressPercent(33, 100)).toBe(33);
    expect(getGoalProgressPercent(1, 3)).toBe(33); // 33.33... rounds to 33
  });

  it("clamps result to 100 when current exceeds target", () => {
    expect(getGoalProgressPercent(150, 100)).toBe(100);
    expect(getGoalProgressPercent(200, 100)).toBe(100);
  });

  it("clamps result to 0 for negative values", () => {
    expect(getGoalProgressPercent(-5, 100)).toBe(0);
  });

  it("handles zero current", () => {
    expect(getGoalProgressPercent(0, 100)).toBe(0);
  });
});

describe("buildPublicGoalSharePath", () => {
  it("returns correct path with username and goalId", () => {
    const result = buildPublicGoalSharePath("testuser", "abc-123");
    expect(result).toBe("/u/testuser/goals/abc-123");
  });

  it("URI-encodes the username", () => {
    const result = buildPublicGoalSharePath("test user", "abc-123");
    expect(result).toContain("test%20user");
  });

  it("URI-encodes the goalId", () => {
    const result = buildPublicGoalSharePath("testuser", "abc 123");
    expect(result).toContain("abc%20123");
  });

  it("handles special characters in username", () => {
    const result = buildPublicGoalSharePath("user@example", "goal-1");
    expect(result).toBe("/u/user%40example/goals/goal-1");
  });
});

describe("buildPublicGoalShareUrl", () => {
  it("concatenates origin and path correctly", () => {
    const result = buildPublicGoalShareUrl("https://devtrack.io", "testuser", "abc-123");
    expect(result).toBe("https://devtrack.io/u/testuser/goals/abc-123");
  });

  it("appends path to origin with no slash normalization", () => {
    // The function concatenates origin + path as-is; it does not strip trailing slashes.
    const result = buildPublicGoalShareUrl("https://devtrack.io/", "testuser", "abc-123");
    expect(result).toBe("https://devtrack.io//u/testuser/goals/abc-123");
  });

  it("URI-encodes username and goalId", () => {
    const result = buildPublicGoalShareUrl("https://devtrack.io", "test user", "abc-123");
    expect(result).toContain("test%20user");
    expect(result).toContain("abc-123");
  });

  it("handles custom port in origin", () => {
    const result = buildPublicGoalShareUrl("http://localhost:3000", "user", "goal");
    expect(result).toBe("http://localhost:3000/u/user/goals/goal");
  });
});
