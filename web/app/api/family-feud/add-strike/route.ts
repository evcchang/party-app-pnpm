import { supabase } from "../../../../lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { roundId } = await req.json();

  // Fetch current strike count
  const { data: round, error: fetchError } = await supabase
    .from("family_feud_rounds")
    .select("strikes")
    .eq("id", roundId)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const newCount = (round?.strikes ?? 0) + 1;

  const { error } = await supabase
    .from("family_feud_rounds")
    .update({ strikes: newCount })
    .eq("id", roundId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, strikes: newCount });
}
