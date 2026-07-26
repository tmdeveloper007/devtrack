import { describe, it, expect } from "vitest";
import { getCodebaseSize, getCodebaseSizeFromLanguages } from "../src/lib/codebase-size";
import type { CodebaseSize } from "../src/lib/codebase-size";

describe("getCodebaseSize", () => {
  it('returns "Small" for 0 bytes', () => {
    expect(getCodebaseSize(0)).toBe("Small");
  });

  it('returns "Small" for bytes just below 50 KB threshold', () => {
    expect(getCodebaseSize(51_199)).toBe("Small");
  });

  it('returns "Medium" at exactly 50 KB', () => {
    expect(getCodebaseSize(51_200)).toBe("Medium");
  });

  it('returns "Medium" for intermediate values', () => {
    expect(getCodebaseSize(100_000)).toBe("Medium");
    expect(getCodebaseSize(400_000)).toBe("Medium");
  });

  it('returns "Medium" at exactly 500 KB', () => {
    expect(getCodebaseSize(512_000)).toBe("Medium");
  });

  it('returns "Large" for bytes just above 500 KB', () => {
    expect(getCodebaseSize(512_001)).toBe("Large");
  });

  it('returns "Large" for large repositories', () => {
    expect(getCodebaseSize(2_000_000)).toBe("Large");
    expect(getCodebaseSize(10_000_000)).toBe("Large");
  });

  it("handles negative values as Small", () => {
    expect(getCodebaseSize(-100)).toBe("Small");
  });
});

describe("getCodebaseSizeFromLanguages", () => {
  it("returns null when languages is undefined", () => {
    expect(getCodebaseSizeFromLanguages(undefined)).toBeNull();
  });

  it("returns null when languages is an empty array", () => {
    expect(getCodebaseSizeFromLanguages([])).toBeNull();
  });

  it("returns null when all language entries have 0 bytes", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 0 }, { bytes: 0 }])).toBeNull();
  });

  it("returns Small for total bytes below 50 KB", () => {
    const result = getCodebaseSizeFromLanguages([
      { bytes: 10_000 },
      { bytes: 20_000 },
    ]);
    expect(result).toBe("Small");
  });

  it("returns Medium for total bytes between 50-500 KB", () => {
    const result = getCodebaseSizeFromLanguages([
      { bytes: 100_000 },
      { bytes: 200_000 },
    ]);
    expect(result).toBe("Medium");
  });

  it("returns Large for total bytes above 500 KB", () => {
    const result = getCodebaseSizeFromLanguages([
      { bytes: 400_000 },
      { bytes: 200_000 },
    ]);
    expect(result).toBe("Large");
  });

  it("handles single language entry", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 30_000 }])).toBe("Small");
    expect(getCodebaseSizeFromLanguages([{ bytes: 600_000 }])).toBe("Large");
  });
});
