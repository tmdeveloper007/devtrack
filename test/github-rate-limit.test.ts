import { describe, it, expect } from "vitest";
import {
  GitHubRateLimitError,
  getGitHubRateLimitDetails,
  throwIfGitHubRateLimited,
  githubRateLimitResponse,
} from "../src/lib/github-rate-limit";

describe("getGitHubRateLimitDetails", () => {
  function makeResponse(status: number, remaining: string | null, reset: string | null) {
    const headers = new Headers();
    if (remaining !== null) headers.set("x-ratelimit-remaining", remaining);
    if (reset !== null) headers.set("x-ratelimit-reset", reset);
    return { status, headers } as unknown as Pick<Response, "status" | "headers">;
  }

  it("returns null when status is not 403 or 429", () => {
    expect(getGitHubRateLimitDetails(makeResponse(200, "0", null))).toBeNull();
  });

  it("returns null when rate limit header remaining is not zero", () => {
    expect(getGitHubRateLimitDetails(makeResponse(403, "10", null))).toBeNull();
  });

  it("returns null when status is 403 but remaining is not zero", () => {
    expect(getGitHubRateLimitDetails(makeResponse(403, null, null))).toBeNull();
  });

  it("returns details when status is 403 and remaining is 0", () => {
    const reset = Math.floor(Date.now() / 1000 + 60).toString();
    const details = getGitHubRateLimitDetails(makeResponse(403, "0", reset));
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    expect(details!.resetAt).not.toBeNull();
    expect(details!.resetAtEpoch).toBe(Number(reset));
  });

  it("returns details when status is 429 and remaining is 0", () => {
    const reset = Math.floor(Date.now() / 1000 + 60).toString();
    const details = getGitHubRateLimitDetails(makeResponse(429, "0", reset));
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
  });

  it("returns message with reset time when reset header is present", () => {
    const reset = Math.floor(Date.now() / 1000 + 60).toString();
    const details = getGitHubRateLimitDetails(makeResponse(429, "0", reset));
    expect(details!.message).toContain("Data will refresh at");
  });

  it("returns generic message when reset header is absent", () => {
    const details = getGitHubRateLimitDetails(makeResponse(429, "0", null));
    expect(details!.message).toBe("GitHub API rate limit reached. Please try again later.");
  });
});

describe("GitHubRateLimitError", () => {
  it("has correct name", () => {
    const error = new GitHubRateLimitError({
      code: "GITHUB_RATE_LIMITED",
      message: "rate limited",
      resetAt: null,
      resetAtEpoch: null,
    });
    expect(error.name).toBe("GitHubRateLimitError");
  });

  it("stores details", () => {
    const details = {
      code: "GITHUB_RATE_LIMITED" as const,
      message: "limited",
      resetAt: null,
      resetAtEpoch: null,
    };
    const error = new GitHubRateLimitError(details);
    expect(error.details).toEqual(details);
    expect(error.message).toBe("limited");
  });
});

describe("throwIfGitHubRateLimited", () => {
  function makeResponse(status: number, remaining: string | null, reset: string | null) {
    const headers = new Headers();
    if (remaining !== null) headers.set("x-ratelimit-remaining", remaining);
    if (reset !== null) headers.set("x-ratelimit-reset", reset);
    return { status, headers } as unknown as Response;
  }

  it("does not throw when not rate limited", () => {
    expect(() => throwIfGitHubRateLimited(makeResponse(200, "100", null))).not.toThrow();
  });

  it("throws GitHubRateLimitError when rate limited", () => {
    const reset = Math.floor(Date.now() / 1000 + 60).toString();
    expect(() => throwIfGitHubRateLimited(makeResponse(429, "0", reset))).toThrow(
      GitHubRateLimitError
    );
  });
});

describe("githubRateLimitResponse", () => {
  it("returns null for non-rate-limit errors", () => {
    expect(githubRateLimitResponse(new Error("oops"))).toBeNull();
  });

  it("returns 429 Response for GitHubRateLimitError", () => {
    const error = new GitHubRateLimitError({
      code: "GITHUB_RATE_LIMITED",
      message: "rate limited",
      resetAt: "2026-01-01T00:00:00Z",
      resetAtEpoch: 1735689600,
    });
    const response = githubRateLimitResponse(error);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
    expect(response!.headers.get("content-type")).toContain("application/json");
  });
});
