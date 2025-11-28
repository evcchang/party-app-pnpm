import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/serverSupabase";

export async function POST(req: Request) {
  const { questionId } = await req.json();

  if (!questionId) {
    return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // 1. Clear old buzzers for any previous question
  const { error: clearOldBuzzesError } = await supabase
    .from("buzzes")
    .delete()
    .not("id", "is", null); // force WHERE

  if (clearOldBuzzesError) {
    console.error("CLEAR OLD BUZZES ERROR:", clearOldBuzzesError);
  }

  // 2. Mark question used
  const { error: usedError } = await supabase
    .from("jeopardy_questions")
    .update({ used: true })
    .eq("id", questionId);

  if (usedError) {
    console.error("MARK USED ERROR:", usedError);
    return NextResponse.json(
      { error: "Failed to mark question used", details: usedError.message },
      { status: 500 }
    );
  }

  // 3. Set selected question in game_state
  const { error: stateError } = await supabase
    .from("game_state")
    .update({
      selected_question: questionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "global");

  if (stateError) {
    console.error("GAME STATE UPDATE ERROR:", stateError);
    return NextResponse.json(
      { error: "Failed to update game state", details: stateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
