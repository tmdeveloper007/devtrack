const assert = require("node:assert/strict");
const test = require("node:test");
const { toDateStr } = require("../src/lib/dateUtils.ts");

test("toDateStr returns YYYY-MM-DD format", () => {
  const date = new Date("2026-05-22T10:00:00Z");
  assert.equal(toDateStr(date), "2026-05-22");
});

test("toDateStr handles various dates", () => {
  assert.equal(toDateStr(new Date("2026-01-01T00:00:00Z")), "2026-01-01");
  assert.equal(toDateStr(new Date("2026-12-31T23:59:59Z")), "2026-12-31");
  assert.equal(toDateStr(new Date("2026-06-15T12:30:00Z")), "2026-06-15");
});

test("toDateStr extracts date portion from datetime", () => {
  const date = new Date("2026-05-22T15:45:30.123Z");
  assert.equal(toDateStr(date), "2026-05-22");
});