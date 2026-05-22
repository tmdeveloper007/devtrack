import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken } from "../src/lib/crypto";

describe("encryptToken", () => {
  const testKey = "a".repeat(64);

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("encrypts a plaintext string and returns encrypted value and iv", () => {
    const result = encryptToken("my-secret-token");
    expect(result).toHaveProperty("encrypted");
    expect(result).toHaveProperty("iv");
    expect(typeof result.encrypted).toBe("string");
    expect(typeof result.iv).toBe("string");
  });

  it("returns non-empty encrypted string", () => {
    const result = encryptToken("my-secret-token");
    expect(result.encrypted.length).toBeGreaterThan(0);
  });

  it("returns a 24-character hex iv (12 bytes)", () => {
    const result = encryptToken("my-secret-token");
    expect(result.iv.length).toBe(24);
    expect(/^[0-9a-f]+$/.test(result.iv)).toBe(true);
  });

  it("produces different iv for each call", () => {
    const result1 = encryptToken("same-token");
    const result2 = encryptToken("same-token");
    expect(result1.iv).not.toBe(result2.iv);
  });

  it("produces different encrypted values for same plaintext (due to random iv)", () => {
    const result1 = encryptToken("same-token");
    const result2 = encryptToken("same-token");
    expect(result1.encrypted).not.toBe(result2.encrypted);
  });

  it("throws error when ENCRYPTION_KEY is not set", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptToken("token")).toThrow("ENCRYPTION_KEY env var must be a 32-byte hex string");
  });

  it("throws error when ENCRYPTION_KEY is invalid", () => {
    process.env.ENCRYPTION_KEY = "invalid-key";
    expect(() => encryptToken("token")).toThrow("ENCRYPTION_KEY env var must be a 32-byte hex string");
  });

  it("throws error when ENCRYPTION_KEY is too short", () => {
    process.env.ENCRYPTION_KEY = "a".repeat(63);
    expect(() => encryptToken("token")).toThrow("ENCRYPTION_KEY env var must be a 32-byte hex string");
  });
});

describe("decryptToken", () => {
  const testKey = "a".repeat(64);

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("decrypts an encrypted token back to original plaintext", () => {
    const original = "my-secret-token";
    const { encrypted, iv } = encryptToken(original);
    const decrypted = decryptToken(encrypted, iv);
    expect(decrypted).toBe(original);
  });

  it("returns null when iv is invalid length", () => {
    const { encrypted } = encryptToken("token");
    const result = decryptToken(encrypted, "too-short-iv");
    expect(result).toBe(null);
  });

  it("returns null when encrypted token format is invalid", () => {
    const result = decryptToken("not-hex-string!", "a".repeat(24));
    expect(result).toBe(null);
  });

  it("returns null when encrypted token is too short", () => {
    const result = decryptToken("abc1", "a".repeat(24));
    expect(result).toBe(null);
  });

  it("returns null when iv contains non-hex characters", () => {
    const { encrypted } = encryptToken("token");
    const result = decryptToken(encrypted, "xyz".repeat(8));
    expect(result).toBe(null);
  });

  it("round-trip works with special characters", () => {
    const original = "token-with-special-chars-!@#$%^&*()";
    const { encrypted, iv } = encryptToken(original);
    const decrypted = decryptToken(encrypted, iv);
    expect(decrypted).toBe(original);
  });

  it("round-trip works with unicode characters", () => {
    const original = "token-with-unicode-你好世界";
    const { encrypted, iv } = encryptToken(original);
    const decrypted = decryptToken(encrypted, iv);
    expect(decrypted).toBe(original);
  });

  it("round-trip works with long token", () => {
    const original = "a".repeat(1000);
    const { encrypted, iv } = encryptToken(original);
    const decrypted = decryptToken(encrypted, iv);
    expect(decrypted).toBe(original);
  });

  it("returns null when decryption fails due to wrong key", () => {
    const { encrypted, iv } = encryptToken("token");
    process.env.ENCRYPTION_KEY = "b".repeat(64);
    const result = decryptToken(encrypted, iv);
    expect(result).toBe(null);
  });

  it("returns null when ENCRYPTION_KEY is not set during decryption", () => {
    const { encrypted, iv } = encryptToken("token");
    delete process.env.ENCRYPTION_KEY;
    const result = decryptToken(encrypted, iv);
    expect(result).toBe(null);
  });
});
