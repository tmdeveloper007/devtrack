const assert = require("node:assert/strict");
const test = require("node:test");

test("cacheGet returns null when redis not configured", async () => {
  const { cacheGet } = require("../src/lib/metrics-cache.js");
  const result = await cacheGet("any-key");
  assert.equal(result, null);
});

test("cacheSet returns early when redis not configured", async () => {
  const { cacheSet } = require("../src/lib/metrics-cache.js");
  await cacheSet("any-key", "any-value", 60);
});

test("cacheSet returns early for invalid TTL values", async () => {
  const { cacheSet } = require("../src/lib/metrics-cache.js");
  await cacheSet("key", "value", -1);
  await cacheSet("key", "value", 0);
  await cacheSet("key", "value", NaN);
  await cacheSet("key", "value", Infinity);
});

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

test("cacheGet handles string type parameter", async () => {
  const { cacheGet } = require("../src/lib/metrics-cache.js");
  const result = await cacheGet("test-string-key");
  assert.equal(result, null);
});

test("cacheGet handles object type parameter", async () => {
  const { cacheGet } = require("../src/lib/metrics-cache.js");
  const result = await cacheGet("test-object-key");
  assert.equal(result, null);
});