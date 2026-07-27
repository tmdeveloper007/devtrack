import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";

describe("csvCell", () => {
  it("returns empty string for null", () => {
    expect(csvCell(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(csvCell(undefined)).toBe("");
  });

  it("passes plain strings through without quoting", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell("world")).toBe("world");
    expect(csvCell("")).toBe("");
  });

  it("wraps strings containing commas in double quotes", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("one,two,three")).toBe('"one,two,three"');
  });

  it("wraps strings containing double quotes and escapes internal quotes", () => {
    expect(csvCell('say "hello"')).toBe('"say ""hello"""');
    expect(csvCell('a "b" c')).toBe('"a ""b"" c"');
  });

  it("wraps strings containing newlines", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("wraps strings containing carriage returns", () => {
    expect(csvCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it("coerces numbers to string without quoting", () => {
    expect(csvCell(0)).toBe("0");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(3.14)).toBe("3.14");
    expect(csvCell(-100)).toBe("-100");
  });

  it("coerces booleans to string without quoting", () => {
    expect(csvCell(true)).toBe("true");
    expect(csvCell(false)).toBe("false");
  });

  it("handles strings with multiple special characters", () => {
    expect(csvCell('Hello, "World"\nNew line')).toBe('"Hello, ""World""\nNew line"');
  });
});

describe("toCsv", () => {
  it("returns empty string for empty rows array", () => {
    expect(toCsv([])).toBe("");
  });

  it("produces header row and one data row for a single-row input", () => {
    const rows = [{ name: "Alice", age: "30" }];
    const result = toCsv(rows);
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("name,age");
    expect(lines[1]).toBe("Alice,30");
  });

  it("uses keys of the first row as headers (stable header)", () => {
    const rows = [
      { name: "Alice", age: "30" },
      { city: "NYC", age: "31" }, // extra key ignored, missing key emits empty cell
    ];
    const result = toCsv(rows);
    const lines = result.split("\n");
    expect(lines[0]).toBe("name,age");
    expect(lines[1]).toBe("Alice,30");
    expect(lines[2]).toBe(",31"); // name is missing, emits empty cell
  });

  it("outputs rows in the same order as input", () => {
    const rows = [
      { id: "1" },
      { id: "2" },
      { id: "3" },
    ];
    const result = toCsv(rows);
    const lines = result.split("\n");
    expect(lines[1]).toBe("1");
    expect(lines[2]).toBe("2");
    expect(lines[3]).toBe("3");
  });

  it("handles mixed value types including null and numbers", () => {
    const rows = [
      { name: "Bob", score: 42, active: true, note: null },
    ];
    const result = toCsv(rows);
    const lines = result.split("\n");
    expect(lines[1]).toBe("Bob,42,true,");
  });

  it("escapes special characters in cell values", () => {
    const rows = [{ value: 'say "hi", thanks' }];
    const result = toCsv(rows);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"say ""hi"", thanks"');
  });
});
