import { supabase } from "../../../../lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { answerId } = await req.json();

  const { error } = await supabase
    .from("family_feud_answers")
    .update({ revealed: true })
    .eq("id", answerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
