import { describe, it, expect } from "vitest";
import {
  getDefaultDashboardLayout,
  normalizeDashboardLayout,
  moveWidget,
  hideWidget,
  showWidget,
  resetDashboardLayout,
  DEFAULT_DASHBOARD_LAYOUT,
} from "../src/lib/dashboard-layout";

describe("getDefaultDashboardLayout", () => {
  it("returns a layout with all four sections", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.sections).toContain("overview");
    expect(layout.sections).toContain("activity");
    expect(layout.sections).toContain("analytics");
    expect(layout.sections).toContain("goals");
  });

  it("returns a layout with non-empty widget arrays for each section", () => {
    const layout = getDefaultDashboardLayout();
    expect(layout.widgets.overview.length).toBeGreaterThan(0);
    expect(layout.widgets.activity.length).toBeGreaterThan(0);
    expect(layout.widgets.analytics.length).toBeGreaterThan(0);
    expect(layout.widgets.goals.length).toBeGreaterThan(0);
  });

  it("hidden array is empty by default", () => {
    expect(getDefaultDashboardLayout().hidden).toEqual([]);
  });

  it("version is 1", () => {
    expect(getDefaultDashboardLayout().version).toBe(1);
  });

  it("returns a new object each time (not the same reference)", () => {
    const first = getDefaultDashboardLayout();
    const second = getDefaultDashboardLayout();
    expect(first).not.toBe(second);
    expect(first.widgets).not.toBe(second.widgets);
  });
});

describe("normalizeDashboardLayout", () => {
  it("returns default layout for null input", () => {
    const result = normalizeDashboardLayout(null);
    expect(result.sections).toEqual(DEFAULT_DASHBOARD_LAYOUT.sections);
  });

  it("returns default layout for undefined input", () => {
    const result = normalizeDashboardLayout(undefined);
    expect(result.sections).toEqual(DEFAULT_DASHBOARD_LAYOUT.sections);
  });

  it("returns default layout for non-object input", () => {
    expect(normalizeDashboardLayout("string" as any).sections).toEqual(DEFAULT_DASHBOARD_LAYOUT.sections);
    expect(normalizeDashboardLayout(123 as any).sections).toEqual(DEFAULT_DASHBOARD_LAYOUT.sections);
  });

  it("deduplicates widgets that appear in multiple sections", () => {
    const layout = {
      ...getDefaultDashboardLayout(),
      widgets: {
        overview: ["weekly-summary", "weekly-summary"] as any,
        activity: [] as any,
        analytics: [] as any,
        goals: [] as any,
      },
    };
    const result = normalizeDashboardLayout(layout);
    const count = result.widgets.overview.filter((w) => w === "weekly-summary").length;
    expect(count).toBe(1);
  });

  it("deduplicates hidden widget array", () => {
    const layout = {
      ...getDefaultDashboardLayout(),
      hidden: ["weekly-summary", "weekly-summary"] as any,
    };
    const result = normalizeDashboardLayout(layout);
    expect(result.hidden.filter((w) => w === "weekly-summary").length).toBe(1);
  });

  it("filters out invalid widget IDs from sections", () => {
    const layout = {
      ...getDefaultDashboardLayout(),
      widgets: {
        overview: ["weekly-summary", "invalid-widget-id" as any],
        activity: [] as any,
        analytics: [] as any,
        goals: [] as any,
      },
    };
    const result = normalizeDashboardLayout(layout);
    expect(result.widgets.overview).toContain("weekly-summary");
    expect(result.widgets.overview).not.toContain("invalid-widget-id");
  });
});

describe("moveWidget", () => {
  it("moves widget within the same section to a new position", () => {
    const layout = getDefaultDashboardLayout();
    // Use a widget near the start and move it to the end
    const widgetToMove = layout.widgets.overview[0];
    const originalIndex = layout.widgets.overview.indexOf(widgetToMove);
    const targetIndex = layout.widgets.overview.length;

    const result = moveWidget(layout, "overview", "overview", widgetToMove, targetIndex);
    const resultIndex = result.widgets.overview.indexOf(widgetToMove);
    // Widget should be at the end (length - 1) not at its original position
    expect(resultIndex).toBe(layout.widgets.overview.length - 1);
    expect(resultIndex).not.toBe(originalIndex);
  });

  it("moves widget from one section to another", () => {
    const layout = getDefaultDashboardLayout();
    const widgetToMove = layout.widgets.overview[0];

    const result = moveWidget(layout, "overview", "activity", widgetToMove, 0);
    expect(result.widgets.activity).toContain(widgetToMove);
    expect(result.widgets.overview).not.toContain(widgetToMove);
  });

  it("handles out-of-range index by clamping", () => {
    const layout = getDefaultDashboardLayout();
    const widgetToMove = layout.widgets.overview[0];

    // index = 999 is way out of range
    const result = moveWidget(layout, "overview", "overview", widgetToMove, 999);
    const widgetIndex = result.widgets.overview.indexOf(widgetToMove);
    expect(widgetIndex).toBeLessThan(result.widgets.overview.length);
  });

  it("handles negative index by clamping to 0", () => {
    const layout = getDefaultDashboardLayout();
    const widgetToMove = layout.widgets.overview[0];
    const result = moveWidget(layout, "overview", "overview", widgetToMove, -5);
    const widgetIndex = result.widgets.overview.indexOf(widgetToMove);
    expect(widgetIndex).toBe(0);
  });
});

describe("hideWidget", () => {
  it("removes widget from all sections", () => {
    const layout = getDefaultDashboardLayout();
    const widgetToHide = layout.widgets.overview[0];

    const result = hideWidget(layout, widgetToHide);
    for (const section of ["overview", "activity", "analytics", "goals"] as const) {
      expect(result.widgets[section]).not.toContain(widgetToHide);
    }
  });

  it("adds widget to hidden array", () => {
    const layout = getDefaultDashboardLayout();
    const widgetToHide = layout.widgets.overview[0];
    const result = hideWidget(layout, widgetToHide);
    expect(result.hidden).toContain(widgetToHide);
  });

  it("does not duplicate widget in hidden if already hidden", () => {
    const layout = {
      ...getDefaultDashboardLayout(),
      hidden: ["weekly-summary"] as any,
    };
    const result = hideWidget(layout, "weekly-summary");
    expect(result.hidden.filter((w) => w === "weekly-summary").length).toBe(1);
  });
});

describe("showWidget", () => {
  it("removes widget from hidden array", () => {
    const layout = { ...getDefaultDashboardLayout(), hidden: ["weekly-summary"] as any };
    const result = showWidget(layout, "weekly-summary");
    expect(result.hidden).not.toContain("weekly-summary");
  });

  it("adds widget to its default section", () => {
    const layout = { ...getDefaultDashboardLayout(), hidden: ["weekly-summary"] as any };
    const result = showWidget(layout, "weekly-summary");
    expect(result.widgets.overview).toContain("weekly-summary");
  });

  it("does not duplicate widget if already visible in any section", () => {
    const layout = getDefaultDashboardLayout();
    const countBefore = layout.widgets.overview.filter((w) => w === "weekly-summary").length;
    const result = showWidget(layout, "weekly-summary");
    const countAfter = result.widgets.overview.filter((w) => w === "weekly-summary").length;
    expect(countAfter).toBe(countBefore);
  });
});

describe("resetDashboardLayout", () => {
  it("returns the same result as getDefaultDashboardLayout", () => {
    expect(resetDashboardLayout()).toEqual(getDefaultDashboardLayout());
  });
});
