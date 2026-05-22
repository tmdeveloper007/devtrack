const assert = require("node:assert/strict");
const test = require("node:test");

const originalEnv = process.env.ENCRYPTION_KEY;

function resetEncryptionKey() {
  if (originalEnv) {
    process.env.ENCRYPTION_KEY = originalEnv;
  } else {
    delete process.env.ENCRYPTION_KEY;
  }
}

test("encryptToken requires ENCRYPTION_KEY env var", () => {
  delete process.env.ENCRYPTION_KEY;
  const { encryptToken } = require("../src/lib/crypto.js");
  assert.throws(() => encryptToken("test"), /ENCRYPTION_KEY env var must be a 32-byte hex string/);
});

test("encryptToken requires valid hex string for ENCRYPTION_KEY", () => {
  process.env.ENCRYPTION_KEY = "not-valid-hex";
  const { encryptToken } = require("../src/lib/crypto.js");
  assert.throws(() => encryptToken("test"), /ENCRYPTION_KEY env var must be a 32-byte hex string/);
});

test("encryptToken requires 64 character hex string (32 bytes)", () => {
  process.env.ENCRYPTION_KEY = "abc123";
  const { encryptToken } = require("../src/lib/crypto.js");
  assert.throws(() => encryptToken("test"), /ENCRYPTION_KEY env var must be a 32-byte hex string/);
});

test("encryptToken returns object with encrypted and iv properties", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { encryptToken } = require("../src/lib/crypto.js");
  const result = encryptToken("test-token");
  assert.ok("encrypted" in result);
  assert.ok("iv" in result);
});

test("encryptToken returns hex strings for encrypted and iv", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { encryptToken } = require("../src/lib/crypto.js");
  const result = encryptToken("test-token");
  assert.ok(/^[0-9a-f]+$/.test(result.encrypted));
  assert.ok(/^[0-9a-f]+$/.test(result.iv));
});

test("encryptToken iv is 24 hex characters (12 bytes)", () => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
  const { encryptToken } = require("../src/lib/crypto.js");
  const result = encryptToken("test-token");
  assert.equal(result.iv.length, 24);
});