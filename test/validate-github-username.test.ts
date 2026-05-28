import { describe, it, expect } from "vitest";
import { isValidGitHubUsername, normalizeGitHubUsername } from "../src/lib/validate-github-username";

describe("validate-github-username", () => {
  describe("isValidGitHubUsername", () => {
    it("should accept valid standard usernames", () => {
      expect(isValidGitHubUsername("octocat")).toBe(true);
      expect(isValidGitHubUsername("dev-track")).toBe(true);
      expect(isValidGitHubUsername("A1b2C3")).toBe(true);
    });

    it("should accept minimum length username (1 char)", () => {
      expect(isValidGitHubUsername("a")).toBe(true);
      expect(isValidGitHubUsername("0")).toBe(true);
    });

    it("should accept maximum length username (39 chars)", () => {
      expect(isValidGitHubUsername("a".repeat(39))).toBe(true);
    });

    it("should reject usernames exceeding 39 chars", () => {
      expect(isValidGitHubUsername("a".repeat(40))).toBe(false);
    });

    it("should reject usernames starting or ending with a hyphen", () => {
      expect(isValidGitHubUsername("-leading")).toBe(false);
      expect(isValidGitHubUsername("trailing-")).toBe(false);
    });

    it("should reject path or query parameters", () => {
      expect(isValidGitHubUsername("../search/repositories?q=test")).toBe(false);
      expect(isValidGitHubUsername("someuser+org:private-org")).toBe(false);
      expect(isValidGitHubUsername("user@domain.com")).toBe(false);
    });

    it("should reject usernames with spaces", () => {
      expect(isValidGitHubUsername("invalid user")).toBe(false);
    });
  });

  describe("normalizeGitHubUsername", () => {
    it("should trim valid username and return it", () => {
      expect(normalizeGitHubUsername("  octocat  ")).toBe("octocat");
    });

    it("should return null for empty/whitespace input", () => {
      expect(normalizeGitHubUsername("")).toBeNull();
      expect(normalizeGitHubUsername("   ")).toBeNull();
    });

    it("should return null for non-string types", () => {
      expect(normalizeGitHubUsername(null as any)).toBeNull();
      expect(normalizeGitHubUsername(undefined as any)).toBeNull();
      expect(normalizeGitHubUsername(123 as any)).toBeNull();
    });

    it("should return null for invalid trimmed username", () => {
      expect(normalizeGitHubUsername("bad/user")).toBeNull();
      expect(normalizeGitHubUsername("-bad-")).toBeNull();
    });
  });
});
