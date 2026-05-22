const assert = require("node:assert/strict");
const test = require("node:test");

function clamp(n, min, max) {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

function scoreCommitFrequency(commits30d) {
  const normalized = clamp(commits30d / 10, 0, 1);
  return normalized * 25;
}

test("scoreCommitFrequency returns 0 for 0 commits", () => {
  assert.equal(scoreCommitFrequency(0), 0);
});

test("scoreCommitFrequency returns 25 for 10+ commits", () => {
  assert.equal(scoreCommitFrequency(10), 25);
  assert.equal(scoreCommitFrequency(15), 25);
  assert.equal(scoreCommitFrequency(100), 25);
});

test("scoreCommitFrequency scales linearly for commits 0-10", () => {
  assert.equal(scoreCommitFrequency(5), 12.5);
  assert.equal(scoreCommitFrequency(2.5), 6.25);
});

test("scoreCommitFrequency handles NaN", () => {
  assert.equal(scoreCommitFrequency(NaN), 0);
});

test("scoreCommitFrequency handles negative commits", () => {
  assert.equal(scoreCommitFrequency(-5), 0);
});