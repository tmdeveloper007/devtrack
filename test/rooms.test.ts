import { describe, it, expect } from "vitest";
import {
  normalizeRoomGithubUsername,
  githubUsernamesEqual,
} from "@/lib/rooms";

describe("rooms", () => {
  describe("normalizeRoomGithubUsername", () => {
    it("returns username as-is for valid input (case preserved)", () => {
      expect(normalizeRoomGithubUsername("Alice")).toBe("Alice");
    });

    it("trims whitespace", () => {
      expect(normalizeRoomGithubUsername("  bob  ")).toBe("bob");
    });

    it("returns null for null input", () => {
      expect(normalizeRoomGithubUsername(null)).toBeNull();
    });

    it("returns null for undefined input", () => {
      expect(normalizeRoomGithubUsername(undefined)).toBeNull();
    });

    it("returns null for invalid GitHub usernames", () => {
      expect(normalizeRoomGithubUsername("invalid-")).toBeNull();
      expect(normalizeRoomGithubUsername("user name")).toBeNull();
    });

    it("preserves case for hyphenated usernames", () => {
      expect(normalizeRoomGithubUsername("My-Repo")).toBe("My-Repo");
    });
  });

  describe("githubUsernamesEqual", () => {
    it("returns true for identical usernames", () => {
      expect(githubUsernamesEqual("alice", "alice")).toBe(true);
    });

    it("returns true for case-insensitive match", () => {
      expect(githubUsernamesEqual("Alice", "alice")).toBe(true);
      expect(githubUsernamesEqual("ALICE", "alice")).toBe(true);
      expect(githubUsernamesEqual("AlIcE", "aLiCe")).toBe(true);
    });

    it("returns false for different usernames", () => {
      expect(githubUsernamesEqual("alice", "bob")).toBe(false);
    });

    it("handles hyphenated usernames case-insensitively", () => {
      expect(githubUsernamesEqual("My-Repo", "my-repo")).toBe(true);
      expect(githubUsernamesEqual("MY-REPO", "my-repo")).toBe(true);
    });
  });
});
