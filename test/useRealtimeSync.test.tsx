import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

import { useRealtimeSync } from "../src/hooks/useRealtimeSync";

// ── Tests for the polling fallback path (Supabase not configured) ───────────────

describe("useRealtimeSync — polling fallback", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Ensure env vars are NOT set so getSupabaseClient returns null
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initial isLive is false", () => {
    const { result } = renderHook(() =>
      useRealtimeSync("goals", ["INSERT"], vi.fn())
    );

    expect(result.current.isLive).toBe(false);
  });

  it("polls onUpdate at the configured interval", async () => {
    const onUpdate = vi.fn();

    renderHook(() =>
      useRealtimeSync("goals", ["INSERT"], onUpdate, { fallbackPollingMs: 100 })
    );

    // Should not have fired before the interval
    expect(onUpdate).not.toHaveBeenCalled();

    // Advance past the first polling interval
    await act(async () => {
      vi.advanceTimersByTime(110);
      await new Promise(r => setTimeout(r, 5));
    });

    expect(onUpdate).toHaveBeenCalled();
  });

  it("polls multiple times across several intervals", async () => {
    const onUpdate = vi.fn();

    renderHook(() =>
      useRealtimeSync("goals", ["INSERT"], onUpdate, { fallbackPollingMs: 50 })
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
      await new Promise(r => setTimeout(r, 5));
    });

    // At 50ms interval over 200ms, we should get ~4 polls
    expect(onUpdate.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("uses default polling interval of 60s when fallbackPollingMs not specified", async () => {
    const onUpdate = vi.fn();

    renderHook(() =>
      useRealtimeSync("goals", ["INSERT"], onUpdate)
    );

    // After 1 second, the 60s default should not have fired
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await new Promise(r => setTimeout(r, 5));
    });

    // Should not have fired (interval is 60s)
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("cleans up polling on unmount", async () => {
    const onUpdate = vi.fn();

    const { unmount } = renderHook(() =>
      useRealtimeSync("goals", ["INSERT"], onUpdate, { fallbackPollingMs: 50 })
    );

    await act(async () => {
      vi.advanceTimersByTime(60);
      await new Promise(r => setTimeout(r, 5));
    });

    const callsBeforeUnmount = onUpdate.mock.calls.length;

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(100);
      await new Promise(r => setTimeout(r, 5));
    });

    // After unmount, no new polling calls should have been made
    expect(onUpdate.mock.calls.length).toBe(callsBeforeUnmount);
  });
});

// ── Tests for the WebSocket path (Supabase configured) ─────────────────────────

describe("useRealtimeSync — WebSocket path", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initial isLive is false before subscription resolves", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const { result } = renderHook(() =>
      useRealtimeSync("goals", ["INSERT"], vi.fn())
    );

    expect(result.current.isLive).toBe(false);

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });
});
