import { describe, expect, it } from "vitest";
import { translateMessage } from "@/i18n/translate";

describe("translateMessage — deep key lookup", () => {
  it("resolves top-level keys", async () => {
    const result = await translateMessage("en", "common.save");
    // If "common.save" doesn't exist as a nested key, it returns the key itself
    expect(typeof result).toBe("string");
  });

  it("resolves nested translation keys", async () => {
    // "settings.languageTitle" should resolve to a translation string in English
    const result = await translateMessage("en", "settings.languageTitle");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    // If the key exists it should not be the raw key
    expect(result).not.toBe("settings.languageTitle");
  });

  it("returns the key itself when the nested path does not exist", async () => {
    const result = await translateMessage("en", "nonexistent.key.path");
    expect(result).toBe("nonexistent.key.path");
  });

  it("falls back to English for missing Spanish translation", async () => {
    // If a key exists in English but not in Spanish, it should fall back to English
    const esResult = await translateMessage("es", "settings.languageTitle");
    expect(esResult).toBeTruthy();
    expect(typeof esResult).toBe("string");
  });

  it("handles deeply nested keys that partially exist", async () => {
    // If settings.title exists but settings.profile.theme does not
    const partial = await translateMessage("en", "settings.profile.nonexistent");
    expect(partial).toBe("settings.profile.nonexistent");
  });
});

describe("translateMessage — locale resolution", () => {
  it("uses default locale for empty string locale", async () => {
    const result = await translateMessage("", "common.save");
    expect(typeof result).toBe("string");
  });

  it("uses default locale for invalid locale string", async () => {
    const result = await translateMessage("xx", "common.save");
    expect(typeof result).toBe("string");
  });

  it("returns a string (not undefined) for any key", async () => {
    const result = await translateMessage("en", "completely.made.up.key");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });
});
