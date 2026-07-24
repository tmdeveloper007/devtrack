import { describe, it, expect } from "vitest";
import {
  getCodebaseSize,
  getCodebaseSizeFromLanguages,
} from "@/lib/codebase-size";

describe("getCodebaseSize", () => {
  it("classifies bytes below 50 KB as Small", () => {
    expect(getCodebaseSize(0)).toBe("Small");
    expect(getCodebaseSize(51_199)).toBe("Small");
  });

  it("classifies bytes at exactly 50 KB as Medium", () => {
    expect(getCodebaseSize(51_200)).toBe("Medium");
  });

  it("classifies bytes between 50 KB and 500 KB as Medium", () => {
    expect(getCodebaseSize(100_000)).toBe("Medium");
    expect(getCodebaseSize(511_999)).toBe("Medium");
  });

  it("classifies bytes at exactly 500 KB as Medium", () => {
    expect(getCodebaseSize(512_000)).toBe("Medium");
  });

  it("classifies bytes above 500 KB as Large", () => {
    expect(getCodebaseSize(512_001)).toBe("Large");
    expect(getCodebaseSize(1_000_000)).toBe("Large");
  });
});

describe("getCodebaseSizeFromLanguages", () => {
  it("returns null when languages is undefined", () => {
    expect(getCodebaseSizeFromLanguages(undefined)).toBeNull();
  });

  it("returns null when languages is an empty array", () => {
    expect(getCodebaseSizeFromLanguages([])).toBeNull();
  });

  it("returns null when all bytes are zero", () => {
    expect(getCodebaseSizeFromLanguages([{ bytes: 0 }])).toBeNull();
  });

  it("returns Small for a small total byte count", () => {
    const languages = [{ bytes: 10_000 }, { bytes: 20_000 }];
    expect(getCodebaseSizeFromLanguages(languages)).toBe("Small");
  });

  it("returns Medium for a medium total byte count", () => {
    const languages = [{ bytes: 100_000 }, { bytes: 200_000 }];
    expect(getCodebaseSizeFromLanguages(languages)).toBe("Medium");
  });

  it("returns Large for a large total byte count", () => {
    const languages = [{ bytes: 600_000 }];
    expect(getCodebaseSizeFromLanguages(languages)).toBe("Large");
  });
});
