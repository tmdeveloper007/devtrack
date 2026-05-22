const assert = require("node:assert/strict");
const test = require("node:test");

function clamp(n, min, max) {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

test("clamp returns min for non-finite values", () => {
  assert.equal(clamp(NaN, 0, 100), 0);
  assert.equal(clamp(Infinity, 0, 100), 0);
  assert.equal(clamp(-Infinity, 0, 100), 0);
});

test("clamp returns value within range", () => {
  assert.equal(clamp(50, 0, 100), 50);
});

test("clamp returns min when value is below range", () => {
  assert.equal(clamp(-10, 0, 100), 0);
});

test("clamp returns max when value is above range", () => {
  assert.equal(clamp(150, 0, 100), 100);
});

test("clamp handles boundary values", () => {
  assert.equal(clamp(0, 0, 100), 0);
  assert.equal(clamp(100, 0, 100), 100);
});

test("clamp works with negative ranges", () => {
  assert.equal(clamp(0, -50, -10), -10);
  assert.equal(clamp(-30, -50, -10), -30);
  assert.equal(clamp(-60, -50, -10), -50);
});

test("clamp works with decimal values", () => {
  assert.equal(clamp(0.5, 0, 1), 0.5);
  assert.equal(clamp(-0.5, 0, 1), 0);
  assert.equal(clamp(1.5, 0, 1), 1);
});