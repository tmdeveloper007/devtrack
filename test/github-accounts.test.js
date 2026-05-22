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

test("mergeMetrics returns null for empty results", () => {
  const result = mergeMetrics([], (a, b) => a + b);
  assert.equal(result, null);
});

test("mergeMetrics returns null when all results are rejected", () => {
  const results = [
    { status: "rejected", reason: "error1" },
    { status: "rejected", reason: "error2" },
  ];
  const result = mergeMetrics(results, (a, b) => a + b);
  assert.equal(result, null);
});

test("mergeMetrics returns first fulfilled value when only one", () => {
  const results = [
    { status: "fulfilled", value: 42 },
    { status: "rejected", reason: "error" },
  ];
  const result = mergeMetrics(results, (a, b) => a + b);
  assert.equal(result, 42);
});

test("mergeMetrics merges multiple fulfilled values", () => {
  const results = [
    { status: "fulfilled", value: 10 },
    { status: "fulfilled", value: 20 },
    { status: "fulfilled", value: 30 },
  ];
  const result = mergeMetrics(results, (a, b) => a + b);
  assert.equal(result, 60);
});

test("mergeMetrics works with objects", () => {
  const results = [
    { status: "fulfilled", value: { count: 5 } },
    { status: "fulfilled", value: { count: 10 } },
  ];
  const result = mergeMetrics(results, (a, b) => ({ count: a.count + b.count }));
  assert.deepEqual(result, { count: 15 });
});

test("mergeMetrics handles mixed fulfilled and rejected", () => {
  const results = [
    { status: "fulfilled", value: 100 },
    { status: "rejected", reason: "error1" },
    { status: "fulfilled", value: 50 },
    { status: "rejected", reason: "error2" },
  ];
  const result = mergeMetrics(results, (a, b) => a + b);
  assert.equal(result, 150);
});