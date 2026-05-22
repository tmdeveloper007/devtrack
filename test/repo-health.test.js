const assert = require("node:assert/strict");
const test = require("node:test");

function clamp(n, min, max) {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

function scoreOpenIssuesCount(openIssues) {
  if (openIssues <= 0) return 15;
  if (openIssues >= 20) return 0;
  const normalized = 1 - openIssues / 20;
  return clamp(normalized, 0, 1) * 15;
}

test("scoreOpenIssuesCount returns 15 for openIssues <= 0", () => {
  assert.equal(scoreOpenIssuesCount(0), 15);
  assert.equal(scoreOpenIssuesCount(-1), 15);
  assert.equal(scoreOpenIssuesCount(-10), 15);
});

test("scoreOpenIssuesCount returns 0 for openIssues >= 20", () => {
  assert.equal(scoreOpenIssuesCount(20), 0);
  assert.equal(scoreOpenIssuesCount(25), 0);
  assert.equal(scoreOpenIssuesCount(100), 0);
});

test("scoreOpenIssuesCount scales linearly between 0 and 20", () => {
  const midPoint = scoreOpenIssuesCount(10);
  assert.ok(midPoint > 0 && midPoint < 15);
  assert.equal(scoreOpenIssuesCount(10), 7.5);
});

test("scoreOpenIssuesCount handles boundary at 0 issues", () => {
  assert.equal(scoreOpenIssuesCount(0), 15);
});

test("scoreOpenIssuesCount handles boundary at 20 issues", () => {
  assert.equal(scoreOpenIssuesCount(20), 0);
});

test("scoreOpenIssuesCount handles NaN", () => {
  assert.equal(scoreOpenIssuesCount(NaN), 0);
});

test("scoreOpenIssuesCount handles infinity", () => {
  assert.equal(scoreOpenIssuesCount(Infinity), 0);
});