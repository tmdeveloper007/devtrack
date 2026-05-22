const assert = require("node:assert/strict");
const test = require("node:test");

function clamp(n, min, max) {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

function scoreAvgPrOpenTimeHours(avgHours) {
  if (avgHours <= 24) return 20;
  if (avgHours >= 168) return 0;
  const normalized = 1 - (avgHours - 24) / (168 - 24);
  return clamp(normalized, 0, 1) * 20;
}

test("scoreAvgPrOpenTimeHours returns 20 for avgHours <= 24", () => {
  assert.equal(scoreAvgPrOpenTimeHours(0), 20);
  assert.equal(scoreAvgPrOpenTimeHours(12), 20);
  assert.equal(scoreAvgPrOpenTimeHours(24), 20);
});

test("scoreAvgPrOpenTimeHours returns 0 for avgHours >= 168", () => {
  assert.equal(scoreAvgPrOpenTimeHours(168), 0);
  assert.equal(scoreAvgPrOpenTimeHours(200), 0);
});

test("scoreAvgPrOpenTimeHours scales linearly between 24 and 168 hours", () => {
  const midPoint = scoreAvgPrOpenTimeHours(96);
  assert.ok(midPoint > 0 && midPoint < 20);
});

test("scoreAvgPrOpenTimeHours handles boundary at 24 hours", () => {
  assert.equal(scoreAvgPrOpenTimeHours(23.99), 20);
});

test("scoreAvgPrOpenTimeHours handles boundary at 168 hours", () => {
  assert.equal(scoreAvgPrOpenTimeHours(168), 0);
});

test("scoreAvgPrOpenTimeHours handles NaN", () => {
  assert.equal(scoreAvgPrOpenTimeHours(NaN), 0);
});

test("scoreAvgPrOpenTimeHours handles positive infinity", () => {
  assert.equal(scoreAvgPrOpenTimeHours(Infinity), 0);
});

test("scoreAvgPrOpenTimeHours handles negative infinity", () => {
  assert.equal(scoreAvgPrOpenTimeHours(-Infinity), 20);
});