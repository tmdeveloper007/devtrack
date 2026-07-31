import { describe, it, expect } from "vitest";
import {
  getGoalProgressPercent,
  buildPublicGoalSharePath,
  buildPublicGoalShareUrl,
} from "@/lib/goals/share";

describe("goals/share", () => {
  describe("getGoalProgressPercent", () => {
    it("returns 0 when current is 0 and target is 100", () => {
      expect(getGoalProgressPercent(0, 100)).toBe(0);
    });

    it("returns 50 when current is half of target", () => {
      expect(getGoalProgressPercent(50, 100)).toBe(50);
    });

    it("returns 100 when current equals target", () => {
      expect(getGoalProgressPercent(100, 100)).toBe(100);
    });

    it("caps at 100 when current exceeds target", () => {
      expect(getGoalProgressPercent(150, 100)).toBe(100);
    });

    it("returns 0 when target is 0 (division by zero guard)", () => {
      expect(getGoalProgressPercent(10, 0)).toBe(0);
    });

    it("returns 0 when current is NaN", () => {
      expect(getGoalProgressPercent(NaN, 100)).toBe(0);
    });

    it("returns 0 when target is NaN", () => {
      expect(getGoalProgressPercent(50, NaN)).toBe(0);
    });

    it("returns 0 when current is Infinity", () => {
      expect(getGoalProgressPercent(Infinity, 100)).toBe(0);
    });

    it("returns 0 when target is Infinity", () => {
      expect(getGoalProgressPercent(50, Infinity)).toBe(0);
    });

    it("returns 0 when current is negative", () => {
      expect(getGoalProgressPercent(-10, 100)).toBe(0);
    });

    it("rounds to nearest integer", () => {
      expect(getGoalProgressPercent(1, 3)).toBe(33);
      expect(getGoalProgressPercent(2, 3)).toBe(67);
    });
  });

  describe("buildPublicGoalSharePath", () => {
    it("builds the correct path for a simple username and goalId", () => {
      expect(buildPublicGoalSharePath("alice", "goal-123")).toBe(
        "/u/alice/goals/goal-123"
      );
    });

    it("encodes special characters in username", () => {
      expect(buildPublicGoalSharePath("alice bob", "goal-123")).toBe(
        "/u/alice%20bob/goals/goal-123"
      );
    });

    it("encodes special characters in goalId", () => {
      expect(buildPublicGoalSharePath("alice", "goal/123")).toBe(
        "/u/alice/goals/goal%2F123"
      );
    });

    it("encodes both username and goalId with special chars", () => {
      expect(buildPublicGoalSharePath("alice bob", "goal/123")).toBe(
        "/u/alice%20bob/goals/goal%2F123"
      );
    });

    it("does not double-encode already encoded values", () => {
      const encoded = encodeURIComponent("alice&bob");
      expect(buildPublicGoalSharePath("alice&bob", "goal-1")).toBe(
        `/u/${encoded}/goals/goal-1`
      );
    });
  });

  describe("buildPublicGoalShareUrl", () => {
    it("concatenates origin and path correctly", () => {
      expect(buildPublicGoalShareUrl("https://devtrack.example", "alice", "goal-123")).toBe(
        "https://devtrack.example/u/alice/goals/goal-123"
      );
    });

    it("handles origin without trailing slash", () => {
      expect(buildPublicGoalShareUrl("https://devtrack.example", "alice", "goal-123")).toBe(
        "https://devtrack.example/u/alice/goals/goal-123"
      );
    });

    it("handles origin with port", () => {
      expect(buildPublicGoalShareUrl("http://localhost:3000", "alice", "goal-1")).toBe(
        "http://localhost:3000/u/alice/goals/goal-1"
      );
    });

    it("encodes special characters in the result", () => {
      const url = buildPublicGoalShareUrl("https://devtrack.example", "alice bob", "goal/123");
      expect(url).toBe("https://devtrack.example/u/alice%20bob/goals/goal%2F123");
    });
  });
});
