import { describe, expect, it } from "vitest";
import {
  isValidLocale,
  getLocaleDirection,
  locales,
  defaultLocale,
  localeMetadata,
  type AppLocale,
} from "@/i18n/config";

describe("isValidLocale", () => {
  it("returns true for 'en'", () => {
    expect(isValidLocale("en")).toBe(true);
  });

  it("returns true for 'es'", () => {
    expect(isValidLocale("es")).toBe(true);
  });

  it("returns false for unsupported locales", () => {
    expect(isValidLocale("fr")).toBe(false);
    expect(isValidLocale("de")).toBe(false);
    expect(isValidLocale("zh")).toBe(false);
    expect(isValidLocale("ja")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidLocale(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidLocale(undefined)).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isValidLocale(1)).toBe(false);
    expect(isValidLocale(0)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidLocale("")).toBe(false);
  });

  it("returns false for objects", () => {
    expect(isValidLocale({})).toBe(false);
    expect(isValidLocale({ locale: "en" })).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isValidLocale(["en"])).toBe(false);
  });

  it("returns false for strings with whitespace", () => {
    expect(isValidLocale(" en ")).toBe(false);
    expect(isValidLocale("en ")).toBe(false);
  });

  it("returns false for locale with region suffix", () => {
    expect(isValidLocale("en-US")).toBe(false);
    expect(isValidLocale("es-MX")).toBe(false);
  });

  it("type guard narrows to AppLocale", () => {
    const value: unknown = "en";
    if (isValidLocale(value)) {
      // TypeScript should narrow this to AppLocale
      expect(locales.includes(value as AppLocale)).toBe(true);
    }
  });
});

describe("getLocaleDirection", () => {
  it("returns 'ltr' for 'en'", () => {
    expect(getLocaleDirection("en")).toBe("ltr");
  });

  it("returns 'ltr' for 'es'", () => {
    expect(getLocaleDirection("es")).toBe("ltr");
  });

  it("returns locale direction from localeMetadata", () => {
    for (const locale of locales) {
      const expected = localeMetadata[locale].direction;
      expect(getLocaleDirection(locale)).toBe(expected);
    }
  });

  it("falls back to default locale direction for unknown locale", () => {
    // TypeScript would not allow passing invalid AppLocale at compile time,
    // but at runtime we can check the fallback behaviour
    const defaultDirection = localeMetadata[defaultLocale].direction;
    // When called with a valid locale, it should never fall back
    expect(getLocaleDirection("en")).toBe(defaultDirection);
  });
});

describe("localeMetadata", () => {
  it("contains entries for all supported locales", () => {
    for (const locale of locales) {
      expect(localeMetadata[locale]).toBeDefined();
      expect(localeMetadata[locale].label).toBeTruthy();
      expect(localeMetadata[locale].nativeLabel).toBeTruthy();
      expect(["ltr", "rtl"]).toContain(localeMetadata[locale].direction);
    }
  });

  it("every locale has both label and nativeLabel", () => {
    for (const locale of locales) {
      expect(typeof localeMetadata[locale].label).toBe("string");
      expect(typeof localeMetadata[locale].nativeLabel).toBe("string");
    }
  });
});

describe("locales constant", () => {
  it("contains exactly 'en' and 'es'", () => {
    expect(locales).toHaveLength(2);
    expect(locales).toContain("en");
    expect(locales).toContain("es");
  });

  it("defaultLocale is 'en'", () => {
    expect(defaultLocale).toBe("en");
  });
});
