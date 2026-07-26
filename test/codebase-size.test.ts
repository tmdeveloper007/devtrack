import { describe, it, expect } from "vitest";
import { getCodebaseSize, getCodebaseSizeFromLanguages } from "@/lib/codebase-size";

describe("getCodebaseSize", () => {
  it("returns Small for 0 bytes", () => { expect(getCodebaseSize(0)).toBe("Small"); });
  it("returns Small for just under 50 KB threshold", () => { expect(getCodebaseSize(51_199)).toBe("Small"); });
  it("returns Medium at exactly 50 KB threshold", () => { expect(getCodebaseSize(51_200)).toBe("Medium"); });
  it("returns Medium for 1 byte over 50 KB", () => { expect(getCodebaseSize(51_201)).toBe("Medium"); });
  it("returns Medium at exactly 500 KB threshold", () => { expect(getCodebaseSize(512_000)).toBe("Medium"); });
  it("returns Large for 1 byte over 500 KB", () => { expect(getCodebaseSize(512_001)).toBe("Large"); });
  it("returns Large for very large byte counts", () => { expect(getCodebaseSize(10_000_000)).toBe("Large"); });
});

describe("getCodebaseSizeFromLanguages", () => {
  it("returns null for undefined input", () => { expect(getCodebaseSizeFromLanguages(undefined)).toBeNull(); });
  it("returns null for empty array", () => { expect(getCodebaseSizeFromLanguages([])).toBeNull(); });
  it("returns null when all bytes sum to zero", () => { expect(getCodebaseSizeFromLanguages([{ bytes: 0 }, { bytes: 0 }])).toBeNull(); });
  it("returns Small for total bytes below 50 KB", () => { expect(getCodebaseSizeFromLanguages([{ bytes: 30_000 }, { bytes: 10_000 }])).toBe("Small"); });
  it("returns Medium for total bytes between 50 KB and 500 KB", () => { expect(getCodebaseSizeFromLanguages([{ bytes: 200_000 }, { bytes: 150_000 }])).toBe("Medium"); });
  it("returns Large for total bytes above 500 KB", () => { expect(getCodebaseSizeFromLanguages([{ bytes: 400_000 }, { bytes: 200_000 }])).toBe("Large"); });
  it("handles single language entry summing to Medium", () => { expect(getCodebaseSizeFromLanguages([{ bytes: 300_000 }])).toBe("Medium"); });
});
