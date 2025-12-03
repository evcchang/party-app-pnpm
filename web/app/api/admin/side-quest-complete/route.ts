import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/serverSupabase";

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { id, playerId, points } = await req.json();

  if (!id || !playerId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // Mark quest inactive + completed timestamp
  await supabase
    .from("player_side_quests")
    .update({
      active: false,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Award points
  await supabase.rpc("increment_points", {
    player_id: playerId,
    delta: points,
  });

  return NextResponse.json({ success: true });
}
