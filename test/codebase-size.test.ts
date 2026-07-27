import { describe, it, expect } from "vitest";
import { getCodebaseSize, getCodebaseSizeFromLanguages } from "@/lib/codebase-size";

describe("codebase-size", () => {
  describe("getCodebaseSize", () => {
    it('classifies "Small" for bytes below 50 KB threshold', () => {
      expect(getCodebaseSize(0)).toBe("Small");
      expect(getCodebaseSize(1)).toBe("Small");
      expect(getCodebaseSize(51_199)).toBe("Small");
    });

    it('classifies "Small" for exactly 50 KB - 1 byte', () => {
      expect(getCodebaseSize(51_199)).toBe("Small");
    });

    it('classifies "Medium" for exactly 50 KB', () => {
      expect(getCodebaseSize(51_200)).toBe("Medium");
    });

    it('classifies "Medium" for values between 50 KB and 500 KB', () => {
      expect(getCodebaseSize(100_000)).toBe("Medium");
      expect(getCodebaseSize(300_000)).toBe("Medium");
      expect(getCodebaseSize(511_999)).toBe("Medium");
    });

    it('classifies "Medium" for exactly 500 KB', () => {
      expect(getCodebaseSize(512_000)).toBe("Medium");
    });

    it('classifies "Large" for bytes above 500 KB', () => {
      expect(getCodebaseSize(512_001)).toBe("Large");
      expect(getCodebaseSize(1_000_000)).toBe("Large");
      expect(getCodebaseSize(10_000_000)).toBe("Large");
    });
  });

  describe("getCodebaseSizeFromLanguages", () => {
    it("returns null for undefined input", () => {
      expect(getCodebaseSizeFromLanguages(undefined)).toBeNull();
    });

    it("returns null for empty array", () => {
      expect(getCodebaseSizeFromLanguages([])).toBeNull();
    });

    it("returns null when all language bytes are zero", () => {
      expect(getCodebaseSizeFromLanguages([{ bytes: 0 }])).toBeNull();
    });

    it("classifies correctly with a single language", () => {
      expect(getCodebaseSizeFromLanguages([{ bytes: 30_000 }])).toBe("Small");
      expect(getCodebaseSizeFromLanguages([{ bytes: 200_000 }])).toBe("Medium");
      expect(getCodebaseSizeFromLanguages([{ bytes: 600_000 }])).toBe("Large");
    });

    it("sums bytes across multiple languages", () => {
      // Total 51,000 bytes — below 51,200 threshold → Small
      const smallLanguages = [
        { bytes: 30_000 },
        { bytes: 20_000 },
        { bytes: 1_000 },
      ];
      expect(getCodebaseSizeFromLanguages(smallLanguages)).toBe("Small");

      // Total 500,000 bytes — exactly at 500 KB threshold → Medium
      const mediumLanguages = [
        { bytes: 200_000 },
        { bytes: 300_000 },
      ];
      expect(getCodebaseSizeFromLanguages(mediumLanguages)).toBe("Medium");
    });

    it("classifies at exact threshold boundaries with multiple languages", () => {
      // Exactly 51,199 bytes — below Small threshold (51,200) → Small
      const justBelow50KB = [
        { bytes: 30_000 },
        { bytes: 21_199 },
      ];
      expect(getCodebaseSizeFromLanguages(justBelow50KB)).toBe("Small");

      // Exactly 51,200 bytes — at Small/Medium boundary → Medium
      const at50KB = [
        { bytes: 30_000 },
        { bytes: 21_200 },
      ];
      expect(getCodebaseSizeFromLanguages(at50KB)).toBe("Medium");
    });
  });
});
