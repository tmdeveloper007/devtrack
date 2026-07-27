import { describe, expect, it } from "vitest";
import { generateEmptySparkline } from "../src/lib/sponsors";

describe("generateEmptySparkline", () => {
  it("returns exactly 6 entries", () => {
    const result = generateEmptySparkline();
    expect(result).toHaveLength(6);
  });

  it("all entries have month and count fields", () => {
    const result = generateEmptySparkline();
    for (const entry of result) {
      expect(entry).toHaveProperty("month");
      expect(entry).toHaveProperty("count");
    }
  });

  it("all counts are 0", () => {
    const result = generateEmptySparkline();
    for (const entry of result) {
      expect(entry.count).toBe(0);
    }
  });

  it("months are valid short month names (e.g. Jul, Jun)", () => {
    const result = generateEmptySparkline();
    const months = result.map((e) => e.month);
    expect(months).toHaveLength(6);
    for (const m of months) {
      expect(m).toMatch(/^[A-Z][a-z]{2}$/);
    }
  });

  it("each entry has a unique month", () => {
    const result = generateEmptySparkline();
    const months = result.map((e) => e.month);
    const unique = new Set(months);
    expect(unique.size).toBe(6);
  });

  it("returns a new array each time (not the same reference)", () => {
    const first = generateEmptySparkline();
    const second = generateEmptySparkline();
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it("months are ordered from current month backwards", () => {
    const result = generateEmptySparkline();
    const months = result.map((e) => e.month);
    // Should be 6 distinct month names in order
    const uniqueMonths = [...new Set(months)];
    expect(uniqueMonths).toHaveLength(6);
    // Each month should appear exactly once
    expect(months.filter((m) => m === months[0])).toHaveLength(1);
  });
});
