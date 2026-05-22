const assert = require("node:assert/strict");
const test = require("node:test");

test("decryptToken returns null for invalid encrypted format (non-hex)", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { decryptToken } = require("../src/lib/crypto.js");
  const result = decryptToken("not-valid-hex!", "00".repeat(12));
  assert.equal(result, null);
});

test("decryptToken returns null for invalid encrypted format (odd length)", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { decryptToken } = require("../src/lib/crypto.js");
  const result = decryptToken("abc", "00".repeat(12));
  assert.equal(result, null);
});

test("decryptToken returns null for invalid IV format (non-hex)", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { decryptToken } = require("../src/lib/crypto.js");
  const result = decryptToken("00".repeat(32), "not-valid-hex!");
  assert.equal(result, null);
});

test("decryptToken returns null for invalid IV format (odd length)", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { decryptToken } = require("../src/lib/crypto.js");
  const result = decryptToken("00".repeat(32), "00".repeat(11));
  assert.equal(result, null);
});

test("decryptToken returns null for invalid IV length", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { decryptToken } = require("../src/lib/crypto.js");
  const result = decryptToken("00".repeat(32), "00".repeat(10));
  assert.equal(result, null);
});

test("decryptToken returns null for encrypted token too short", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { decryptToken } = require("../src/lib/crypto.js");
  const result = decryptToken("00".repeat(10), "00".repeat(12));
  assert.equal(result, null);
});

test("decryptToken returns null when ENCRYPTION_KEY is missing", () => {
  delete process.env.ENCRYPTION_KEY;
  const { decryptToken } = require("../src/lib/crypto.js");
  const result = decryptToken("00".repeat(32), "00".repeat(12));
  assert.equal(result, null);
});