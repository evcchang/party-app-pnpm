import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/serverSupabase";

export async function POST(req: Request) {
  console.log("API /api/game/mode HIT");

  const { mode } = await req.json().catch((e) => {
    console.error("JSON PARSE ERROR:", e);
    return {};
  });

  console.log("Requested mode:", mode);

  if (!mode || !["normal", "jeopardy"].includes(mode)) {
    console.error("Invalid mode:", mode);
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServerSupabase();
  } catch (e) {
    console.error("SUPABASE INIT ERROR:", e);
    return NextResponse.json(
      { error: "Supabase init failed", details: String(e) },
      { status: 500 }
    );
  }

  // Update game_state
  const { error: modeError } = await supabase
    .from("game_state")
    .update({
      game_mode: mode,
      selected_question: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "global");

  if (modeError) {
    console.error("GAME_STATE UPDATE ERROR:", modeError);
    return NextResponse.json(
      {
        error: "Failed to update game mode",
        details: modeError.message,
      },
      { status: 500 }
    );
  }

  if (mode === "normal") {
    // Reset all questions to unused
    const { error: resetError } = await supabase
      .from("jeopardy_questions")
      .update({ used: false })
      .not("id", "is", null);
  
    if (resetError) {
      console.error("RESET QUESTIONS ERROR:", resetError);
    }
  
    // Clear ALL buzzes
    const { error: clearBuzzError } = await supabase
      .from("buzzes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  
    if (clearBuzzError) {
      console.error("CLEAR BUZZES ERROR:", clearBuzzError);
    }
  }  

  console.log("SUCCESS");
  return NextResponse.json({ success: true });
}
