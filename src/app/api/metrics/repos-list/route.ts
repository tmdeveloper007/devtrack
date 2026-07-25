/**
 * GET /api/metrics/repos-list
 *
 * Returns a complete, paginated list of all user repositories via the GitHub REST API.
 * Unlike /api/metrics/repos (which uses the Commit Search API and is limited to
 * repositories with recent commits), this endpoint uses fetchUserRepos to enumerate
 * ALL repos the user owns across all pages, enabling complete repo lists for users
 * with more than 100 repositories.
 *
 * Used by the settings page for spotlight repository pinning.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchUserRepos } from "@/lib/github";
import { resolveAppUser } from "@/lib/resolve-user";
import { GitHubAuthError } from "@/lib/github-fetch";
import { isMetricsCacheBypassed, metricsCacheKey, withMetricsCache } from "@/lib/metrics-cache";
import { METRICS_CACHE_TTL_SECONDS } from "@/lib/metrics-cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const bypass = isMetricsCacheBypassed(req);
  const key = metricsCacheKey(user.id, "repos-list" as any, {});

  const token = (user as any).github_token ?? (user as any).access_token;
  if (!token) {
    return NextResponse.json({ error: "GitHub token not found" }, { status: 401 });
  }

  try {
    const data = await withMetricsCache(
      { bypass, key, ttlSeconds: METRICS_CACHE_TTL_SECONDS.streak },
      async () => {
        // Fetch up to 1000 repos (10 pages x 100 per page) using the REST API.
        // This ensures users with >100 repos see their complete list for spotlight pinning.
        const repos = await fetchUserRepos(token, { perPage: 100, maxPages: 10 });

        return {
          repos: repos.map((r) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description,
            url: r.html_url,
            language: r.language ?? null,
            stargazerCount: r.stargazers_count ?? 0,
            forkCount: r.forks_count ?? 0,
            updatedAt: r.updated_at,
            createdAt: r.created_at,
            pushedAt: r.pushed_at,
          })),
        };
      }
    );

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof GitHubAuthError) {
      return NextResponse.json({ error: "GitHub auth failed" }, { status: 401 });
    }
    console.error("[repos-list] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
