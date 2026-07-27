import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveAppUser } from "@/lib/resolve-user";
import { stripHtml } from "@/lib/sanitize";

const MAX_GOAL_LEN = 280;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = value.match(DATE_PATTERN);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
}

function validateDate(value: unknown): string | null {
  return isValidDate(value) ? null : "Date must be a valid YYYY-MM-DD value";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(session.githubId, session.githubLogin);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    let date = searchParams.get("date");

    if (!date) {
      date = new Date().toISOString().split("T")[0];
    }

    const dateError = validateDate(date);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    const { data } = await supabaseAdmin
      .from("daily_focus")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .single();

    return NextResponse.json({
      goal: data?.goal_text || "",
    });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(session.githubId, session.githubLogin);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { goal_text, date } = body;

    if (typeof goal_text !== "string" || !goal_text.trim()) {
      return NextResponse.json({ error: "Goal cannot be empty" }, { status: 400 });
    }

    const sanitizedGoal = stripHtml(goal_text);
    if (!sanitizedGoal) {
      return NextResponse.json({ error: "Goal cannot be empty" }, { status: 400 });
    }
    if (sanitizedGoal.length > MAX_GOAL_LEN) {
      return NextResponse.json(
        { error: `Goal must be ${MAX_GOAL_LEN} characters or fewer` },
        { status: 400 }
      );
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const dateError = validateDate(targetDate);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("daily_focus")
      .upsert(
        { user_id: user.id, date: targetDate, goal_text: sanitizedGoal },
        { onConflict: "user_id,date" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PATCH — update an existing daily focus goal
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(session.githubId, session.githubLogin);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { goal_text, date } = body;

    // At least one field must be provided
    if (goal_text === undefined && date === undefined) {
      return NextResponse.json(
        { error: "At least one of goal_text or date must be provided" },
        { status: 400 }
      );
    }

    const targetDate = date ?? new Date().toISOString().split("T")[0];
    const dateError = validateDate(targetDate);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    // Check if a goal exists for this user and date
    const { data: existing } = await supabaseAdmin
      .from("daily_focus")
      .select("id, goal_text")
      .eq("user_id", user.id)
      .eq("date", targetDate)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "No goal found for this date" },
        { status: 404 }
      );
    }

    const updates: Record<string, string> = { date: targetDate };

    if (goal_text !== undefined) {
      if (typeof goal_text !== "string" || !goal_text.trim()) {
        return NextResponse.json({ error: "Goal cannot be empty" }, { status: 400 });
      }
      const sanitizedGoal = stripHtml(goal_text);
      if (!sanitizedGoal) {
        return NextResponse.json({ error: "Goal cannot be empty" }, { status: 400 });
      }
      if (sanitizedGoal.length > MAX_GOAL_LEN) {
        return NextResponse.json(
          { error: `Goal must be ${MAX_GOAL_LEN} characters or fewer` },
          { status: 400 }
        );
      }
      updates.goal_text = sanitizedGoal;
    }

    const { data, error } = await supabaseAdmin
      .from("daily_focus")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.githubId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveAppUser(session.githubId, session.githubLogin);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const dateError = validateDate(date);
    if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("daily_focus")
      .delete()
      .eq("user_id", user.id)
      .eq("date", date);

    if (error) {
      return NextResponse.json({ error: "Failed to clear goal" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
