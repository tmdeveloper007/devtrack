import { describe, it, expect } from "vitest";
import { cleanUsername, formatRepositoryName } from "./string-utils";

describe("String Utilities", () => {
  describe("cleanUsername", () => {
    it("should trim leading and trailing whitespace", () => {
      expect(cleanUsername("  username  ")).toBe("username");
    });

    it("should convert to lowercase", () => {
      expect(cleanUsername("UsErNaMe")).toBe("username");
    });

    it("should trim and convert mixed-case usernames", () => {
      expect(cleanUsername("  Pratikshya32  ")).toBe("pratikshya32");
    });

    it("should return empty string for empty input", () => {
      expect(cleanUsername("")).toBe("");
    });

    it("should return empty string for whitespace-only input", () => {
      expect(cleanUsername("   ")).toBe("");
    });

    it("should handle usernames with unicode characters", () => {
      expect(cleanUsername("  UsErNaMe_123  ")).toBe("username_123");
    });
  });

  describe("formatRepositoryName", () => {
    it("should trim whitespace", () => {
      expect(formatRepositoryName("  repo-name  ")).toBe("repo-name");
    });

    it("should replace spaces with hyphens", () => {
      expect(formatRepositoryName("Dev Track Repository")).toBe("dev-track-repository");
    });

    it("should replace multiple consecutive spaces with single hyphen", () => {
      expect(formatRepositoryName("Dev    Track")).toBe("dev-track");
    });

    it("should convert to lowercase", () => {
      expect(formatRepositoryName("MyRepo")).toBe("myrepo");
    });

    it("should handle mixed-case with spaces", () => {
      expect(formatRepositoryName("Dev Track Repository")).toBe("dev-track-repository");
    });

    it("should return empty string for empty input", () => {
      expect(formatRepositoryName("")).toBe("");
    });

    it("should return empty string for whitespace-only input", () => {
      expect(formatRepositoryName("   ")).toBe("");
    });

    it("should preserve hyphens and underscores", () => {
      expect(formatRepositoryName("my-awesome_repo")).toBe("my-awesome_repo");
    });
  });
});
