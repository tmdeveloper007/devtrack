import { describe, it, expect } from "vitest";
import { isValidGitHubUsername, normalizeGitHubUsername } from "../src/lib/validate-github-username";

describe("isValidGitHubUsername", () => {
  it("accepts simple usernames", () => {
    expect(isValidGitHubUsername("octocat")).toBe(true);
  });

  it("accepts usernames with numbers", () => {
    expect(isValidGitHubUsername("user123")).toBe(true);
  });

  it("accepts usernames with hyphens", () => {
    expect(isValidGitHubUsername("my-repo")).toBe(true);
  });

  it("accepts mixed case", () => {
    expect(isValidGitHubUsername("UserName123")).toBe(true);
  });

  it("rejects username starting with hyphen", () => {
    expect(isValidGitHubUsername("-invalid")).toBe(false);
  });

  it("rejects username ending with hyphen", () => {
    expect(isValidGitHubUsername("invalid-")).toBe(false);
  });

  it("rejects username with underscore", () => {
    expect(isValidGitHubUsername("user_name")).toBe(false);
  });

  it("rejects username with space", () => {
    expect(isValidGitHubUsername("user name")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidGitHubUsername("")).toBe(false);
  });

  it("rejects long usernames over 39 chars", () => {
    expect(isValidGitHubUsername("a".repeat(40))).toBe(false);
  });

  it("accepts exactly 39 chars", () => {
    expect(isValidGitHubUsername("a".repeat(39))).toBe(true);
  });

  it("accepts single character username", () => {
    expect(isValidGitHubUsername("a")).toBe(true);
    expect(isValidGitHubUsername("1")).toBe(true);
  });

  it("rejects hyphen-only username", () => {
    expect(isValidGitHubUsername("-")).toBe(false);
  });

  it("rejects consecutive hyphens mid-username", () => {
    expect(isValidGitHubUsername("user--name")).toBe(false);
  });

  it("rejects non-ASCII unicode characters", () => {
    expect(isValidGitHubUsername("username\u4e2d\u6587")).toBe(false);
    expect(isValidGitHubUsername("user\u00e9name")).toBe(false);
    expect(isValidGitHubUsername("\u042e\u0437\u0435\u0440\u0433")).toBe(false);
  });

  it("accepts max-length username containing a hyphen", () => {
    // 39 chars: 1 start char + 38 repetitions.
    // To fit a hyphen, the char before it must be followed by an alphanumeric,
    // so hyphen occupies 1 slot, the lookahead consumes 1 more char.
    // Valid 39-char with hyphen: a*37 + "-" + a = 39 chars total.
    expect(isValidGitHubUsername("a".repeat(37) + "-a")).toBe(true);
  });

  it("rejects 40-char username containing hyphen", () => {
    // a*38 + "-" + a = 40 chars — exceeds the 39-char limit
    expect(isValidGitHubUsername("a".repeat(38) + "-a")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(isValidGitHubUsername("user@name")).toBe(false);
    expect(isValidGitHubUsername("user!name")).toBe(false);
    expect(isValidGitHubUsername("user#name")).toBe(false);
  });
});

describe("normalizeGitHubUsername", () => {
  it("returns trimmed username for valid input", () => {
    expect(normalizeGitHubUsername("  octocat  ")).toBe("octocat");
  });

  it("preserves case of valid username", () => {
    expect(normalizeGitHubUsername("UserName")).toBe("UserName");
  });

  it("returns null for null", () => {
    expect(normalizeGitHubUsername(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeGitHubUsername(undefined)).toBeNull();
  });

  it("returns null for non-string", () => {
    expect(normalizeGitHubUsername(123 as any)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeGitHubUsername("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeGitHubUsername("   ")).toBeNull();
  });

  it("returns null for invalid username", () => {
    expect(normalizeGitHubUsername("user name")).toBeNull();
  });

  it("returns null for username starting with hyphen", () => {
    expect(normalizeGitHubUsername("-invalid")).toBeNull();
  });

  it("normalizes 39-char valid username", () => {
    expect(normalizeGitHubUsername("a".repeat(39))).toBe("a".repeat(39));
  });

  it("returns null for hyphen-only username", () => {
    expect(normalizeGitHubUsername("-")).toBeNull();
  });

  it("returns null for consecutive-hyphen username", () => {
    expect(normalizeGitHubUsername("user--name")).toBeNull();
  });

  it("returns null for unicode username", () => {
    expect(normalizeGitHubUsername("username\u4e2d\u6587")).toBeNull();
  });
});
