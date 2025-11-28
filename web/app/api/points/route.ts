import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

export async function POST(req: Request) {
  const { playerId, delta } = await req.json();

  if (!playerId || typeof delta !== "number") {
    return NextResponse.json(
      { error: "Missing playerId or delta" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  const { error } = await supabase.rpc("increment_points", {
    player_id: playerId,
    delta,
  });

  if (error) {
    console.error("increment_points RPC error:", error);
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
