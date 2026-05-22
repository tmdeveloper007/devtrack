const assert = require("node:assert/strict");
const test = require("node:test");

function getRateLimitRemainingFromResponse(data) {
  const remaining = data.resources?.core?.remaining;
  return typeof remaining === "number" ? remaining : 0;
}

test("getRateLimitRemainingFromResponse extracts remaining from valid response", () => {
  const data = {
    resources: {
      core: {
        remaining: 5000,
      },
    },
  };
  const result = getRateLimitRemainingFromResponse(data);
  assert.equal(result, 5000);
});

test("getRateLimitRemainingFromResponse returns 0 when core is missing", () => {
  const data = {
    resources: {},
  };
  const result = getRateLimitRemainingFromResponse(data);
  assert.equal(result, 0);
});

test("getRateLimitRemainingFromResponse returns 0 when resources is missing", () => {
  const data = {};
  const result = getRateLimitRemainingFromResponse(data);
  assert.equal(result, 0);
});

test("getRateLimitRemainingFromResponse returns 0 when remaining is undefined", () => {
  const data = {
    resources: {
      core: {},
    },
  };
  const result = getRateLimitRemainingFromResponse(data);
  assert.equal(result, 0);
});

test("getRateLimitRemainingFromResponse returns 0 for non-number remaining", () => {
  const data = {
    resources: {
      core: {
        remaining: "not a number",
      },
    },
  };
  const result = getRateLimitRemainingFromResponse(data);
  assert.equal(result, 0);
});

test("getRateLimitRemainingFromResponse handles zero remaining", () => {
  const data = {
    resources: {
      core: {
        remaining: 0,
      },
    },
  };
  const result = getRateLimitRemainingFromResponse(data);
  assert.equal(result, 0);
});