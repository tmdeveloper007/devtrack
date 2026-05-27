import { describe, it, expect } from "vitest";
import { formatDate, formatRelativeDate, formatDisplayDate } from "../src/lib/repoAnalyticsUtils";

describe("formatDate", () => {
  it("formats standard date correctly", () => {
    const result = formatDate("2024-03-15");
    expect(result).toContain("Mar");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("throws for invalid date strings", () => {
    expect(() => formatDate("not-a-date")).toThrow();
  });

  it("handles leap year Feb 29", () => {
    const result = formatDate("2024-02-29");
    expect(result).toContain("Feb");
    expect(result).toContain("29");
    expect(result).toContain("2024");
  });
});

describe("formatRelativeDate", () => {
  it("returns Today for current date", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = formatRelativeDate(today);
    expect(result).toBe("Today");
  });

  it("returns Yesterday for previous date", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const result = formatRelativeDate(yesterday);
    expect(result).toBe("Yesterday");
  });

  it("returns days ago for dates within 30 days", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0];
    const result = formatRelativeDate(fiveDaysAgo);
    expect(result).toContain("days ago");
  });
});

describe("formatDisplayDate", () => {
  it("handles string date input", () => {
    const result = formatDisplayDate("2024-06-15");
    expect(result).toContain("15");
  });

  it("handles Date object input", () => {
    const date = new Date("2024-06-15");
    const result = formatDisplayDate(date);
    expect(result).toContain("15");
  });
});