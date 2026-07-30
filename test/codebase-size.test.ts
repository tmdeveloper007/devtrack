import { describe, expect, it } from "vitest";
import {
  getCodebaseSize,
  getCodebaseSizeFromLanguages,
  type CodebaseSize,
} from "@/lib/codebase-size";

describe("codebase-size", () => {
  describe("getCodebaseSize", () => {
    it("returns Small for bytes below 50 KB threshold", () => {
      expect(getCodebaseSize(0)).toBe<CodebaseSize>("Small");
      expect(getCodebaseSize(1)).toBe<CodebaseSize>("Small");
      expect(getCodebaseSize(51_199)).toBe<CodebaseSize>("Small");
    });

    it("returns Medium for bytes at exactly 50 KB threshold", () => {
      expect(getCodebaseSize(51_200)).toBe<CodebaseSize>("Medium");
    });

    it("returns Medium for bytes between 50 KB and 500 KB", () => {
      expect(getCodebaseSize(100_000)).toBe<CodebaseSize>("Medium");
      expect(getCodebaseSize(511_999)).toBe<CodebaseSize>("Medium");
    });

    it("returns Medium for bytes at exactly 500 KB threshold", () => {
      expect(getCodebaseSize(512_000)).toBe<CodebaseSize>("Medium");
    });

    it("returns Large for bytes above 500 KB threshold", () => {
      expect(getCodebaseSize(512_001)).toBe<CodebaseSize>("Large");
      expect(getCodebaseSize(1_000_000)).toBe<CodebaseSize>("Large");
    });

    it("handles zero bytes as Small", () => {
      expect(getCodebaseSize(0)).toBe<CodebaseSize>("Small");
    });
  });

  describe("getCodebaseSizeFromLanguages", () => {
    it("returns null when languages is undefined", () => {
      expect(getCodebaseSizeFromLanguages(undefined)).toBeNull();
    });

    it("returns null when languages is an empty array", () => {
      expect(getCodebaseSizeFromLanguages([])).toBeNull();
    });

    it("returns Small for a single language under 50 KB", () => {
      const languages = [{ bytes: 10_000 }];
      expect(getCodebaseSizeFromLanguages(languages)).toBe<CodebaseSize>("Small");
    });

    it("returns Medium for a language at exactly 50 KB", () => {
      const languages = [{ bytes: 51_200 }];
      expect(getCodebaseSizeFromLanguages(languages)).toBe<CodebaseSize>("Medium");
    });

    it("returns Medium for multiple languages totaling 50-500 KB", () => {
      const languages = [{ bytes: 30_000 }, { bytes: 30_000 }];
      expect(getCodebaseSizeFromLanguages(languages)).toBe<CodebaseSize>("Medium");
    });

    it("returns Large for languages totaling over 500 KB", () => {
      const languages = [{ bytes: 300_000 }, { bytes: 300_000 }];
      expect(getCodebaseSizeFromLanguages(languages)).toBe<CodebaseSize>("Large");
    });

    it("returns null when all language bytes are zero", () => {
      const languages = [{ bytes: 0 }, { bytes: 0 }];
      expect(getCodebaseSizeFromLanguages(languages)).toBeNull();
    });

    it("sums bytes across multiple language entries and classifies correctly", () => {
      // 10k + 20k + 30k = 60k -> above 51,200 -> Medium
      const languages = [
        { bytes: 10_000 },
        { bytes: 20_000 },
        { bytes: 30_000 },
      ];
      expect(getCodebaseSizeFromLanguages(languages)).toBe<CodebaseSize>("Medium");
    });
  });
});
