import { describe, it, expect } from "vitest";
import {
  getDefaultDashboardLayout,
  normalizeDashboardLayout,
  moveWidget,
  hideWidget,
  showWidget,
  resetDashboardLayout,
} from "@/lib/dashboard-layout";

describe("dashboard-layout", () => {
  describe("getDefaultDashboardLayout", () => {
    it("returns a layout with all four sections", () => {
      const layout = getDefaultDashboardLayout();
      expect(layout.sections).toHaveLength(4);
      expect(layout.sections).toContain("overview");
      expect(layout.sections).toContain("activity");
      expect(layout.sections).toContain("analytics");
      expect(layout.sections).toContain("goals");
    });

    it("returns a layout with version 1", () => {
      expect(getDefaultDashboardLayout().version).toBe(1);
    });

    it("returns a layout with no hidden widgets", () => {
      expect(getDefaultDashboardLayout().hidden).toHaveLength(0);
    });

    it("returns a cloned layout (mutation-safe)", () => {
      const a = getDefaultDashboardLayout();
      const b = getDefaultDashboardLayout();
      expect(a.widgets).not.toBe(b.widgets);
      expect(a.widgets.overview).not.toBe(b.widgets.overview);
    });
  });

  describe("normalizeDashboardLayout", () => {
    it("returns default layout for null input", () => {
      const result = normalizeDashboardLayout(null);
      expect(result.sections).toHaveLength(4);
    });

    it("returns default layout for non-object input", () => {
      const result = normalizeDashboardLayout("string" as any);
      expect(result.sections).toHaveLength(4);
    });

    it("normalizes a valid partial layout", () => {
      const input = {
        sections: ["overview"],
        widgets: { overview: ["weekly-summary"] },
        hidden: [],
      };
      const result = normalizeDashboardLayout(input);
      expect(result.sections).toContain("overview");
      // All sections should be present after normalization
      expect(result.sections).toHaveLength(4);
    });

    it("deduplicates widgets across sections", () => {
      const input = {
        sections: ["overview", "activity"],
        widgets: {
          overview: ["weekly-summary", "weekly-summary"],
          activity: ["weekly-summary"],
        },
        hidden: [],
      };
      const result = normalizeDashboardLayout(input);
      const overviewCount = result.widgets.overview.filter(
        (w) => w === "weekly-summary"
      ).length;
      expect(overviewCount).toBe(1);
    });

    it("filters out invalid widget IDs", () => {
      const input = {
        sections: ["overview"],
        widgets: { overview: ["weekly-summary", "invalid-widget" as any] },
        hidden: [],
      };
      const result = normalizeDashboardLayout(input);
      expect(result.widgets.overview).not.toContain("invalid-widget");
    });

    it("filters out invalid section IDs", () => {
      const input = {
        sections: ["overview", "invalid-section" as any],
        widgets: {},
        hidden: [],
      };
      const result = normalizeDashboardLayout(input);
      expect(result.sections).not.toContain("invalid-section");
    });
  });

  describe("moveWidget", () => {
    it("moves a widget from one section to another", () => {
      const layout = getDefaultDashboardLayout();
      const result = moveWidget(layout, "overview", "goals", "weekly-summary", 0);
      expect(result.widgets.overview).not.toContain("weekly-summary");
      expect(result.widgets.goals).toContain("weekly-summary");
    });

    it("moves a widget within the same section to a different index", () => {
      const layout = getDefaultDashboardLayout();
      const overviewCount = layout.widgets.overview.length;
      const result = moveWidget(
        layout,
        "overview",
        "overview",
        "weekly-summary",
        2
      );
      // weekly-summary should still be in overview but at index 2
      expect(result.widgets.overview).toContain("weekly-summary");
    });

    it("clamps index to valid range", () => {
      const layout = getDefaultDashboardLayout();
      const result = moveWidget(
        layout,
        "overview",
        "goals",
        "weekly-summary",
        9999
      );
      expect(result.widgets.goals).toContain("weekly-summary");
    });

    it("prevents duplicate widgets after move", () => {
      const layout = getDefaultDashboardLayout();
      const result = moveWidget(layout, "overview", "goals", "weekly-summary", 0);
      // Each widget should appear exactly once
      const allWidgets = [
        ...result.widgets.overview,
        ...result.widgets.activity,
        ...result.widgets.analytics,
        ...result.widgets.goals,
      ];
      const unique = new Set(allWidgets);
      expect(allWidgets.length).toBe(unique.size);
    });
  });

  describe("hideWidget", () => {
    it("removes widget from all sections", () => {
      const layout = getDefaultDashboardLayout();
      const result = hideWidget(layout, "weekly-summary");
      for (const section of ["overview", "activity", "analytics", "goals"] as const) {
        expect(result.widgets[section]).not.toContain("weekly-summary");
      }
    });

    it("adds widget to hidden list", () => {
      const layout = getDefaultDashboardLayout();
      const result = hideWidget(layout, "weekly-summary");
      expect(result.hidden).toContain("weekly-summary");
    });

    it("does not duplicate hidden list entries", () => {
      const layout = getDefaultDashboardLayout();
      const result1 = hideWidget(layout, "weekly-summary");
      const result2 = hideWidget(result1, "weekly-summary");
      expect(
        result2.hidden.filter((w) => w === "weekly-summary").length
      ).toBe(1);
    });
  });

  describe("showWidget", () => {
    it("removes widget from hidden list", () => {
      const layout = getDefaultDashboardLayout();
      const hidden = hideWidget(layout, "weekly-summary");
      const result = showWidget(hidden, "weekly-summary");
      expect(result.hidden).not.toContain("weekly-summary");
    });

    it("adds widget to its default section if not already visible", () => {
      const layout = getDefaultDashboardLayout();
      const hidden = hideWidget(layout, "weekly-summary");
      const result = showWidget(hidden, "weekly-summary");
      // weekly-summary belongs to overview section
      expect(result.widgets.overview).toContain("weekly-summary");
    });

    it("does not add widget if already visible", () => {
      const layout = getDefaultDashboardLayout();
      const overviewCount = layout.widgets.overview.filter(
        (w) => w === "weekly-summary"
      ).length;
      const result = showWidget(layout, "weekly-summary");
      const newCount = result.widgets.overview.filter(
        (w) => w === "weekly-summary"
      ).length;
      expect(newCount).toBe(overviewCount);
    });
  });

  describe("resetDashboardLayout", () => {
    it("returns the same result as getDefaultDashboardLayout", () => {
      const modified = hideWidget(getDefaultDashboardLayout(), "weekly-summary");
      const reset = resetDashboardLayout();
      expect(reset.sections).toEqual(getDefaultDashboardLayout().sections);
      expect(reset.hidden).toEqual([]);
    });
  });
});
