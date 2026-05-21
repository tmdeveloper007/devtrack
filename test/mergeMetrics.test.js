const assert = require("node:assert/strict");
const test = require("node:test");

function mergeMetrics(results, merge) {
  const fulfilled = results.filter(
    (result) => result.status === "fulfilled"
  );

  if (fulfilled.length === 0) {
    return null;
  }

  if (fulfilled.length === 1) {
    return fulfilled[0].value;
  }

  return fulfilled
    .slice(1)
    .reduce((acc, result) => merge(acc, result.value), fulfilled[0].value);
}

test("mergeMetrics returns null for empty results array", () => {
  const result = mergeMetrics([], (a, b) => a + b);
  assert.equal(result, null);
});

test("mergeMetrics returns first value for single result", () => {
  const results = [{ status: "fulfilled", value: 10 }];
  const result = mergeMetrics(results, (a, b) => a + b);
  assert.equal(result, 10);
});

test("mergeMetrics merges multiple fulfilled results", () => {
  const results = [
    { status: "fulfilled", value: 10 },
    { status: "fulfilled", value: 20 },
    { status: "fulfilled", value: 30 },
  ];
  const result = mergeMetrics(results, (a, b) => a + b);
  assert.equal(result, 60);
});