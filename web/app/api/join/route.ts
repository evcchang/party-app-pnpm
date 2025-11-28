import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { name, team } = await req.json();

    if (!name || !team) {
      return NextResponse.json({ error: "Missing name or team" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // check for existing player
    const { data: existingPlayer, error: selectError } = await supabase
      .from("players")
      .select("*")
      .eq("name", name)
      .eq("team", team)
      .maybeSingle();

    if (selectError) {
      console.error("Select error:", selectError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let player = existingPlayer;

    // create new player if not exists
    if (!player) {
      const { data: newPlayer, error: insertError } = await supabase
        .from("players")
        .insert({ name, team, points: 0 })
        .select("*")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json({ error: "Failed to create player" }, { status: 500 });
      }

      player = newPlayer;
    }

    // create session token
    const sessionToken = randomUUID();
    const { error: sessionError } = await supabase
      .from("player_sessions")
      .insert({ player_id: player.id, token: sessionToken });

    if (sessionError) {
      console.error("Session insert error:", sessionError);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      playerId: player.id,
    });

    response.cookies.set("player_token", sessionToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("Join route exception:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
