import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin, isSupabaseAdminAvailable } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getUserId(githubId: string): Promise<string | null> {
  if (!isSupabaseAdminAvailable) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("github_id", githubId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return null;
      }
      console.error("Error fetching user ID from GitHub ID:", { githubId, error });
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("Unexpected error in getUserId:", error);
    return null;
  }
}

// GET — fetch notifications with pagination
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserId(session.githubId);
    if (!userId) {
      return NextResponse.json({ notifications: [], unreadCount: 0, totalCount: 0, page: 1, per_page: 20 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") ?? "20", 10)));
    const offset = (page - 1) * perPage;

    // Fetch total count for pagination metadata
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("Failed to fetch notification count:", countError);
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, type, message, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      console.error("Failed to fetch notifications:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    // unreadCount is computed from all unread, not just the current page
    const { count: unreadTotal } = await supabaseAdmin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    return NextResponse.json({
      notifications: data ?? [],
      unreadCount: unreadTotal ?? 0,
      totalCount: totalCount ?? 0,
      page,
      per_page: perPage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH — mark all as read
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserId(session.githubId);
    if (!userId) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error("Failed to mark notifications as read:", error);
      return NextResponse.json(
        { error: "Failed to update notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in notifications PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — clear (delete) all notifications for the current user
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserId(session.githubId);
    if (!userId) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to delete notifications:", error);
      return NextResponse.json(
        { error: "Failed to delete notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in notifications DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
