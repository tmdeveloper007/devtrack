import { describe, expect, it } from "vitest";
import { getCodebaseSize, getCodebaseSizeFromLanguages } from "../src/lib/codebase-size";

describe("getCodebaseSize", () => {
  it("returns Small when totalBytes is 0", () => {
    expect(getCodebaseSize(0)).toBe("Small");
  });

  it("returns Small when totalBytes is below 51,200", () => {
    expect(getCodebaseSize(51_199)).toBe("Small");
    expect(getCodebaseSize(1)).toBe("Small");
    expect(getCodebaseSize(10_000)).toBe("Small");
  });

  it("returns Medium at exactly 51,200 bytes (lower boundary)", () => {
    expect(getCodebaseSize(51_200)).toBe("Medium");
  });

  it("returns Medium for values between 51,200 and 512,000", () => {
    expect(getCodebaseSize(100_000)).toBe("Medium");
    expect(getCodebaseSize(300_000)).toBe("Medium");
    expect(getCodebaseSize(511_999)).toBe("Medium");
  });

  it("returns Medium at exactly 512,000 bytes (upper boundary)", () => {
    expect(getCodebaseSize(512_000)).toBe("Medium");
  });

  it("returns Large at exactly 512,001 bytes (boundary)", () => {
    expect(getCodebaseSize(512_001)).toBe("Large");
  });

  it("returns Large when totalBytes exceeds 512,000", () => {
    expect(getCodebaseSize(1_000_000)).toBe("Large");
    expect(getCodebaseSize(10_000_000)).toBe("Large");
  });
});

describe("getCodebaseSizeFromLanguages", () => {
  it("returns null when languages is undefined", () => {
    expect(getCodebaseSizeFromLanguages(undefined)).toBeNull();
  });

  it("returns null when languages is an empty array", () => {
    expect(getCodebaseSizeFromLanguages([])).toBeNull();
  });

  it("returns null when all language bytes are zero", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 0 }, { bytes: 0 }])).toBeNull();
  });

  it("returns null when all language bytes are negative", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: -1 }, { bytes: -5 }])).toBeNull();
  });

  it("correctly sums bytes from multiple language entries and classifies as Small", () => {
    const languages = [
      { bytes: 10_000 },
      { bytes: 20_000 },
      { bytes: 15_000 },
    ];
    expect(getCodebaseSizeFromLanguages(languages)).toBe("Small");
  });

  it("correctly sums bytes and classifies as Medium", () => {
    const languages = [
      { bytes: 200_000 },
      { bytes: 150_000 },
    ];
    expect(getCodebaseSizeFromLanguages(languages)).toBe("Medium");
  });

  it("correctly sums bytes and classifies as Large", () => {
    const languages = [
      { bytes: 300_000 },
      { bytes: 400_000 },
    ];
    expect(getCodebaseSizeFromLanguages(languages)).toBe("Large");
  });
});
