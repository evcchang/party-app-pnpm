import { supabase } from "../../../../lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { roundId, teamId } = await req.json();

  // Get all revealed answers for this round
  const { data: answers, error: answersErr } = await supabase
    .from("family_feud_answers")
    .select("points")
    .eq("round_id", roundId)
    .eq("revealed", true);

  if (answersErr) return NextResponse.json({ error: answersErr.message }, { status: 500 });

  const totalPoints = answers.reduce((sum, a) => sum + (a.points || 0), 0);

  // Add points to the team
  const { error: updateErr } = await supabase
    .from("teams")
    .update({ points: supabase.rpc("increment", { x: totalPoints }) })
    .eq("id", teamId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Reset strikes & deactivate round
  await supabase
    .from("family_feud_rounds")
    .update({ strikes: 0, active: false })
    .eq("id", roundId);

  return NextResponse.json({ success: true, awarded: totalPoints });
}
