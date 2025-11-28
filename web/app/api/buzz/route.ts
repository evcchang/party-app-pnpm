import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

export async function POST(req: Request) {
  const { playerId, playerName, team } = await req.json();

  if (!playerId || !playerName || !team) {
    return NextResponse.json({ error: "Missing player info" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // read current game_state
  const { data: state, error: stateError } = await supabase
    .from("game_state")
    .select("selected_question")
    .eq("id", "global")
    .maybeSingle();

  if (stateError || !state || !state.selected_question) {
    return NextResponse.json(
      { error: "No active question to buzz on" },
      { status: 400 }
    );
  }

  const { error: buzzError } = await supabase.from("buzzes").insert({
    question_id: state.selected_question,
    player_id: playerId,
    player_name: playerName,
    team,
  });

  if (buzzError) {
    console.error(buzzError);
    return NextResponse.json({ error: "Failed to record buzz" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
