const assert = require("node:assert/strict");
const test = require("node:test");

function clamp(n, min, max) {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

function scorePrMergeRate(rate) {
  return clamp(rate, 0, 1) * 25;
}

test("scorePrMergeRate returns 0 for rate 0", () => {
  assert.equal(scorePrMergeRate(0), 0);
});

test("scorePrMergeRate returns 25 for rate 1", () => {
  assert.equal(scorePrMergeRate(1), 25);
});

test("scorePrMergeRate scales linearly for rate 0-1", () => {
  assert.equal(scorePrMergeRate(0.5), 12.5);
  assert.equal(scorePrMergeRate(0.25), 6.25);
});

test("scorePrMergeRate clamps negative rates to 0", () => {
  assert.equal(scorePrMergeRate(-0.5), 0);
});

test("scorePrMergeRate clamps rates above 1 to 25", () => {
  assert.equal(scorePrMergeRate(1.5), 25);
});

test("scorePrMergeRate handles non-finite values", () => {
  assert.equal(scorePrMergeRate(NaN), 0);
});