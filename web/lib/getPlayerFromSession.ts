import { cookies } from "next/headers";
import { createServerSupabase } from "./serverSupabase";

export async function getPlayerFromSession() {
  const token = cookies().get("player_token")?.value;
  if (!token) return null;

  const supabase = createServerSupabase();

  const { data: session, error } = await supabase
    .from("player_sessions")
    .select("player_id, players(*)")
    .eq("token", token)
    .maybeSingle();

  if (error || !session || !session.players?.length) return null;

  const player = session.players[0]; // single player object

  return player;
}
