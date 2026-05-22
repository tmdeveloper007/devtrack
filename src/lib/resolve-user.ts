import { supabaseAdmin } from "@/lib/supabase";

export interface AppUser {
  id: string;
}

/**
 * Resolves a GitHub user to an app user, creating one if they don't exist.
 * @param githubId - The GitHub user ID
 * @param githubLogin - Optional GitHub username
 * @returns Promise resolving to AppUser or null if operation failed
 */
export async function resolveAppUser(
  githubId: string,
  githubLogin?: string
): Promise<AppUser | null> {
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", githubId)
    .single();

  if (existing) return existing;

  const { data: upserted } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        github_id: githubId,
        github_login: githubLogin,
        updated_at: new Date().toISOString()
      },
      { onConflict: "github_id" }
    )
    .select("id")
    .single();

  return upserted ?? null;
}
