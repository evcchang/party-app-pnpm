import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/serverSupabase";

export async function POST() {
  const supabase = createServerSupabase();

  const { error } = await supabase
    .from("game_state")
    .update({
      selected_question: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "global");

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to clear question" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
