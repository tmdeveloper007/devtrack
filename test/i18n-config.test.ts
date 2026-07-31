import { describe, it, expect } from "vitest";
import { isValidLocale, getLocaleDirection, locales, localeMetadata, defaultLocale } from "@/i18n/config";

describe("i18n/config", () => {
  describe("isValidLocale", () => {
    it("returns true for en", () => {
      expect(isValidLocale("en")).toBe(true);
    });

    it("returns true for es", () => {
      expect(isValidLocale("es")).toBe(true);
    });

    it("returns false for unknown locales", () => {
      expect(isValidLocale("fr")).toBe(false);
      expect(isValidLocale("de")).toBe(false);
      expect(isValidLocale("zh")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidLocale("")).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isValidLocale(null)).toBe(false);
      expect(isValidLocale(undefined)).toBe(false);
      expect(isValidLocale(123)).toBe(false);
      expect(isValidLocale({})).toBe(false);
      expect(isValidLocale([])).toBe(false);
    });

    it("returns false for invalid locale strings", () => {
      expect(isValidLocale("INVALID")).toBe(false);
      expect(isValidLocale("english")).toBe(false);
      expect(isValidLocale("en-US")).toBe(false);
    });
  });

  describe("getLocaleDirection", () => {
    it("returns ltr for en", () => {
      expect(getLocaleDirection("en")).toBe("ltr");
    });

    it("returns ltr for es", () => {
      expect(getLocaleDirection("es")).toBe("ltr");
    });
  });

  describe("locales", () => {
    it("contains en and es", () => {
      expect(locales).toContain("en");
      expect(locales).toContain("es");
      expect(locales.length).toBe(2);
    });
  });

  describe("localeMetadata", () => {
    it("has correct structure for en", () => {
      expect(localeMetadata.en).toEqual({
        label: "English",
        nativeLabel: "English",
        direction: "ltr",
      });
    });

    it("has correct structure for es", () => {
      expect(localeMetadata.es).toEqual({
        label: "Spanish",
        nativeLabel: "Español",
        direction: "ltr",
      });
    });

    it("all locales have required metadata fields", () => {
      for (const locale of locales) {
        const meta = localeMetadata[locale];
        expect(typeof meta.label).toBe("string");
        expect(typeof meta.nativeLabel).toBe("string");
        expect(["ltr", "rtl"]).toContain(meta.direction);
      }
    });
  });

  describe("defaultLocale", () => {
    it("is a valid locale", () => {
      expect(isValidLocale(defaultLocale)).toBe(true);
    });

    it("is en", () => {
      expect(defaultLocale).toBe("en");
    });
  });
});
