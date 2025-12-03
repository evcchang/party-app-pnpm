import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/serverSupabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("player_side_quests")
    .select(`
      id,
      assigned_at,
      completed_at,
      quest:side_quest_id ( id, prompt, points )
    `)
    .eq("player_id", playerId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }

  return NextResponse.json({ history: data });
}
