const assert = require("node:assert/strict");
const test = require("node:test");

test("metricsCacheKey generates correct key format", async () => {
  const { metricsCacheKey } = require("../src/lib/metrics-cache.js");
  const key = metricsCacheKey("user123", "contributions");
  assert.ok(key.startsWith("metrics:user123:contributions:"));
});

test("metricsCacheKey includes params in key", async () => {
  const { metricsCacheKey } = require("../src/lib/metrics-cache.js");
  const key = metricsCacheKey("user123", "repos", { page: 1 });
  assert.ok(key.includes("page=1"));
});

test("metricsCacheKey filters out null and undefined params", async () => {
  const { metricsCacheKey } = require("../src/lib/metrics-cache.js");
  const key = metricsCacheKey("user123", "repos", { page: 1, limit: null, offset: undefined });
  assert.ok(key.includes("page=1"));
  assert.ok(!key.includes("limit="));
  assert.ok(!key.includes("offset="));
});

test("metricsCacheKey uses default when no params", async () => {
  const { metricsCacheKey } = require("../src/lib/metrics-cache.js");
  const key = metricsCacheKey("user123", "prs");
  assert.ok(key.endsWith(":default"));
});

test("metricsCacheKey sorts params alphabetically", async () => {
  const { metricsCacheKey } = require("../src/lib/metrics-cache.js");
  const key = metricsCacheKey("user123", "contributions", { z: 1, a: 2, m: 3 });
  const paramsPart = key.split(":")[3];
  assert.ok(paramsPart.indexOf("a=2") < paramsPart.indexOf("m=3"));
  assert.ok(paramsPart.indexOf("m=3") < paramsPart.indexOf("z=1"));
});