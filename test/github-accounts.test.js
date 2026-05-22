const assert = require("node:assert/strict");
const test = require("node:test");

function getAllTokensSync(primaryToken, linkedTokens) {
  const dedupedLinkedTokens = linkedTokens.filter(
    (token) => token !== primaryToken
  );
  return [primaryToken, ...dedupedLinkedTokens];
}

test("getAllTokensSync returns primary token first", () => {
  const result = getAllTokensSync("primary", ["linked1", "linked2"]);
  assert.equal(result[0], "primary");
});

test("getAllTokensSync includes all linked tokens", () => {
  const result = getAllTokensSync("primary", ["linked1", "linked2"]);
  assert.equal(result.length, 3);
});

test("getAllTokensSync deduplicates primary token from linked", () => {
  const result = getAllTokensSync("primary", ["primary", "linked1"]);
  assert.equal(result.length, 2);
  assert.equal(result[0], "primary");
  assert.equal(result[1], "linked1");
});

test("getAllTokensSync handles empty linked tokens", () => {
  const result = getAllTokensSync("primary", []);
  assert.equal(result.length, 1);
  assert.equal(result[0], "primary");
});

test("getAllTokensSync handles all duplicate tokens", () => {
  const result = getAllTokensSync("token", ["token", "token"]);
  assert.equal(result.length, 1);
  assert.equal(result[0], "token");
});

test("getAllTokensSync preserves linked token order", () => {
  const result = getAllTokensSync("primary", ["first", "second", "third"]);
  assert.deepEqual(result, ["primary", "first", "second", "third"]);
});