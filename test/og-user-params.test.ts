import { describe, it, expect } from "vitest";
import { normalizeOgUserParams } from "@/lib/og-user-params";

describe("og-user-params", () => {
  describe("normalizeOgUserParams", () => {
    it("builds complete OgUserParams from valid URLSearchParams", () => {
      const params = new URLSearchParams({
        username: "alice",
        name: "Alice Smith",
        topLang: "TypeScript",
        streak: "42",
        commits: "1234",
      });
      const result = normalizeOgUserParams(params);
      expect(result.username).toBe("alice");
      expect(result.name).toBe("Alice Smith");
      expect(result.topLang).toBe("TypeScript");
      expect(result.streak).toBe(42);
      expect(result.commits).toBe(1234);
    });

    it("uses username as name fallback when name is absent", () => {
      const params = new URLSearchParams({ username: "bob" });
      const result = normalizeOgUserParams(params);
      expect(result.name).toBe("bob");
    });

    it("defaults username to 'developer' when absent", () => {
      const params = new URLSearchParams();
      const result = normalizeOgUserParams(params);
      expect(result.username).toBe("developer");
      expect(result.name).toBe("developer");
    });

    it("defaults topLang to 'JavaScript'", () => {
      const params = new URLSearchParams({ username: "alice" });
      const result = normalizeOgUserParams(params);
      expect(result.topLang).toBe("JavaScript");
    });

    it("defaults streak and commits to 0 when absent", () => {
      const params = new URLSearchParams({ username: "alice" });
      const result = normalizeOgUserParams(params);
      expect(result.streak).toBe(0);
      expect(result.commits).toBe(0);
    });

    it("returns 0 for negative streak values", () => {
      const params = new URLSearchParams({ username: "alice", streak: "-5" });
      expect(normalizeOgUserParams(params).streak).toBe(0);
    });

    it("returns 0 for non-numeric streak values", () => {
      const params = new URLSearchParams({ username: "alice", streak: "abc" });
      expect(normalizeOgUserParams(params).streak).toBe(0);
    });

    it("caps streak at MAX_METRIC_VALUE (999999)", () => {
      const params = new URLSearchParams({ username: "alice", streak: "9999999" });
      expect(normalizeOgUserParams(params).streak).toBe(999999);
    });

    it("floors decimal streak values", () => {
      const params = new URLSearchParams({ username: "alice", streak: "42.9" });
      expect(normalizeOgUserParams(params).streak).toBe(42);
    });

    it("truncates name to MAX_NAME_LENGTH (48)", () => {
      const longName = "a".repeat(60);
      const params = new URLSearchParams({ username: "alice", name: longName });
      const result = normalizeOgUserParams(params);
      expect(result.name.length).toBe(48);
    });

    it("truncates topLang to MAX_LANGUAGE_LENGTH (24)", () => {
      const longLang = "b".repeat(30);
      const params = new URLSearchParams({ username: "alice", topLang: longLang });
      const result = normalizeOgUserParams(params);
      expect(result.topLang.length).toBe(24);
    });

    it("generates correct avatar URL", () => {
      const params = new URLSearchParams({ username: "alice" });
      const result = normalizeOgUserParams(params);
      expect(result.avatar).toBe("https://github.com/alice.png?size=200");
    });

    it("trims whitespace from name", () => {
      const params = new URLSearchParams({ username: "alice", name: "  Alice  " });
      expect(normalizeOgUserParams(params).name).toBe("Alice");
    });

    it("treats whitespace-only name as empty and falls back to username", () => {
      const params = new URLSearchParams({ username: "alice", name: "   " });
      expect(normalizeOgUserParams(params).name).toBe("alice");
    });

    it("normalizes GitHub username (invalid becomes 'developer')", () => {
      const params = new URLSearchParams({ username: "invalid-" });
      expect(normalizeOgUserParams(params).username).toBe("developer");
    });
  });
});
