const assert = require("node:assert/strict");
const test = require("node:test");

function getAccountTokenFilter(rows) {
  return rows
    .map((row) => row.decryptedToken)
    .filter((token) => token !== null);
}

test("getAccountTokenFilter returns decrypted tokens", () => {
  const rows = [
    { githubId: "1", decryptedToken: "token1" },
    { githubId: "2", decryptedToken: "token2" },
  ];
  const result = getAccountTokenFilter(rows);
  assert.deepEqual(result, ["token1", "token2"]);
});

test("getAccountTokenFilter filters out null tokens", () => {
  const rows = [
    { githubId: "1", decryptedToken: "token1" },
    { githubId: "2", decryptedToken: null },
  ];
  const result = getAccountTokenFilter(rows);
  assert.deepEqual(result, ["token1"]);
});

test("getAccountTokenFilter handles empty array", () => {
  const result = getAccountTokenFilter([]);
  assert.deepEqual(result, []);
});

test("getAccountTokenFilter handles all null tokens", () => {
  const rows = [
    { githubId: "1", decryptedToken: null },
    { githubId: "2", decryptedToken: null },
  ];
  const result = getAccountTokenFilter(rows);
  assert.deepEqual(result, []);
});

test("getAccountTokenFilter handles empty string tokens", () => {
  const rows = [
    { githubId: "1", decryptedToken: "" },
    { githubId: "2", decryptedToken: "token2" },
  ];
  const result = getAccountTokenFilter(rows);
  assert.deepEqual(result, ["", "token2"]);
});