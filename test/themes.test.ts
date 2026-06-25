import { describe, it, expect } from "vitest";
import {
  isThemeId,
  getThemeDefinition,
  isDarkTheme,
  nextThemeId,
  THEME_OPTIONS,
} from "@/lib/themes";

describe("themes", () => {
  describe("isThemeId", () => {
    it("returns true for all four valid theme IDs", () => {
      expect(isThemeId("classic-dark")).toBe(true);
      expect(isThemeId("modern-light-blue")).toBe(true);
      expect(isThemeId("nordic-frost")).toBe(true);
      expect(isThemeId("cyberpunk-matrix")).toBe(true);
    });

    it("returns false for invalid strings", () => {
      expect(isThemeId("unknown-theme")).toBe(false);
      expect(isThemeId("dark")).toBe(false);
      expect(isThemeId("CLASSIC-DARK")).toBe(false);
    });

    it("returns false for null and undefined", () => {
      expect(isThemeId(null)).toBe(false);
      expect(isThemeId(undefined)).toBe(false);
    });
  });

  describe("getThemeDefinition", () => {
    it("returns the correct definition for each valid theme ID", () => {
      THEME_OPTIONS.forEach((theme) => {
        const def = getThemeDefinition(theme.id);
        expect(def.id).toBe(theme.id);
        expect(def.name).toBe(theme.name);
      });
    });

    it("falls back to the first theme for an invalid ID", () => {
      const def = getThemeDefinition("not-a-theme" as any);
      expect(def.id).toBe(THEME_OPTIONS[0].id);
    });
  });

  describe("isDarkTheme", () => {
    it("returns true for dark-mode themes", () => {
      expect(isDarkTheme("classic-dark")).toBe(true);
      expect(isDarkTheme("nordic-frost")).toBe(true);
      expect(isDarkTheme("cyberpunk-matrix")).toBe(true);
    });

    it("returns false for light-mode themes", () => {
      expect(isDarkTheme("modern-light-blue")).toBe(false);
    });
  });

  describe("nextThemeId", () => {
    it("advances to the next theme in order", () => {
      const order = THEME_OPTIONS.map((t) => t.id);
      for (let i = 0; i < order.length - 1; i++) {
        expect(nextThemeId(order[i] as any)).toBe(order[i + 1]);
      }
    });

    it("wraps from last theme back to first", () => {
      const lastId = THEME_OPTIONS[THEME_OPTIONS.length - 1].id;
      expect(nextThemeId(lastId as any)).toBe(THEME_OPTIONS[0].id);
    });

    it("falls back to second theme when currentTheme is not in list", () => {
      const result = nextThemeId("unknown" as any);
      expect(result).toBe(THEME_OPTIONS[1].id);
    });
  });
});
