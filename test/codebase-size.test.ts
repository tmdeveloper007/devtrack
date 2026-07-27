import { describe, it, expect } from "vitest";
import { getCodebaseSize, getCodebaseSizeFromLanguages } from "../src/lib/codebase-size";

describe("getCodebaseSize", () => {
  it("returns Small for totalBytes below 50 KB", () => {
    expect(getCodebaseSize(0)).toBe("Small");
    expect(getCodebaseSize(1)).toBe("Small");
    expect(getCodebaseSize(51_199)).toBe("Small");
  });

  it("returns Small for exactly 50 KB - 1 byte", () => {
    expect(getCodebaseSize(51_199)).toBe("Small");
  });

  it("returns Medium for totalBytes at the Small threshold (50 KB)", () => {
    expect(getCodebaseSize(51_200)).toBe("Medium");
  });

  it("returns Medium for bytes in the 50 KB - 500 KB range", () => {
    expect(getCodebaseSize(51_201)).toBe("Medium");
    expect(getCodebaseSize(512_000)).toBe("Medium");
  });

  it("returns Large for totalBytes above 500 KB", () => {
    expect(getCodebaseSize(512_001)).toBe("Large");
    expect(getCodebaseSize(1_000_000)).toBe("Large");
    expect(getCodebaseSize(10_000_000)).toBe("Large");
  });

  it("returns Medium for exactly 500 KB", () => {
    expect(getCodebaseSize(512_000)).toBe("Medium");
  });

  it("handles boundary edge cases", () => {
    expect(getCodebaseSize(51_200)).toBe("Medium"); // exactly 50 KB
    expect(getCodebaseSize(512_000)).toBe("Medium"); // exactly 500 KB
    expect(getCodebaseSize(512_001)).toBe("Large"); // 500 KB + 1 byte
  });
});

describe("getCodebaseSizeFromLanguages", () => {
  it("returns null when languages array is undefined", () => {
    expect(getCodebaseSizeFromLanguages(undefined)).toBeNull();
  });

  it("returns null when languages array is empty", () => {
    expect(getCodebaseSizeFromLanguages([])).toBeNull();
  });

  it("returns null when all language bytes are zero", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 0 }])).toBeNull();
    expect(getCodebaseSizeFromLanguages([{ bytes: 0 }, { bytes: 0 }])).toBeNull();
  });

  it("returns Small for total bytes below 50 KB", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 51_199 }])).toBe("Small");
  });

  it("returns Medium for total bytes at 50 KB", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 51_200 }])).toBe("Medium");
  });

  it("returns Medium for total bytes in the 50 KB - 500 KB range", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 100_000 }, { bytes: 200_000 }])).toBe("Medium");
  });

  it("returns Large for total bytes above 500 KB", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 600_000 }])).toBe("Large");
  });

  it("sums bytes correctly across multiple language entries", () => {
    // 30 KB + 30 KB = 60 KB = Medium
    expect(getCodebaseSizeFromLanguages([{ bytes: 30_720 }, { bytes: 30_720 }])).toBe("Medium");
    // 30 KB + 400 KB = 430 KB = Medium
    expect(getCodebaseSizeFromLanguages([{ bytes: 30_720 }, { bytes: 409_600 }])).toBe("Medium");
  });

  it("returns correct size for mixed language totals at boundaries", () => {
    // Exactly 512001 bytes (> 500 KB = Large)
    expect(getCodebaseSizeFromLanguages([{ bytes: 512_001 }])).toBe("Large");
  });
});
