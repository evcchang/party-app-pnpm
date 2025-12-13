import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

export async function POST(req: Request) {
  const { playerId, playerName, team } = await req.json();

  if (!playerId || !playerName || !team) {
    return NextResponse.json({ error: "Missing player info" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Read current game_state
  const { data: state, error: stateError } = await supabase
    .from("game_state")
    .select("game_mode, selected_question")
    .eq("id", "global")
    .maybeSingle();

  if (stateError || !state) {
    return NextResponse.json({ error: "Cannot read game state" }, { status: 500 });
  }

  //
  // ⭐ MODE 1 — JEOPARDY BUZZ
  //
  if (state.game_mode === "jeopardy") {
    if (!state.selected_question) {
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
      console.error("Jeopardy Buzz Error:", buzzError);
      return NextResponse.json({ error: "Failed to record buzz" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  //
  // ⭐ MODE 2 — FAMILY FEUD BUZZ
  //
  if (state.game_mode === "familyfeud") {
    // Find the active feud round
    const { data: round, error: roundError } = await supabase
      .from("family_feud_rounds")
      .select("id")
      .eq("active", true)
      .maybeSingle();

    if (roundError || !round) {
      return NextResponse.json(
        { error: "No active Family Feud round to buzz on" },
        { status: 400 }
      );
    }

    const { data: buzzData, error: buzzError } = await supabase
      .from("buzzes")
      .insert({
        question_id: round.id, // or round.id for feud
        player_id: playerId,
        player_name: playerName,
        team,
      })
      .select();

    if (buzzError) {
      console.error("Family Feud Buzz Error:", buzzError);
      return NextResponse.json({ error: "Failed to record buzz" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  //
  // ⭐ MODE 3 — NORMAL (no buzzing allowed)
  //
  return NextResponse.json(
    { error: "Buzzing is not allowed in this mode" },
    { status: 400 }
  );
}
