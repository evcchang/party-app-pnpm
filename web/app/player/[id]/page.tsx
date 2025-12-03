"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Scoreboard from "../../components/Scoreboard";
import { supabase } from "../../../lib/supabaseClient";
import { getTeamColor } from "../../../lib/getTeamColor";
import { useRouter } from "next/navigation";
import { usePlayerGameModeRedirect } from "../../hooks/usePlayerGameModeRedirect";
import CampFrame from "../../components/CampFrame";

type Player = {
  id: string;
  name: string;
  team: string;
  points: number;
};

export default function PlayerDashboard({ params }: { params: { id: string } }) {
  const playerId = params.id;
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  usePlayerGameModeRedirect(playerId, "normal");

  useEffect(() => {
    async function loadPlayer() {
      setLoading(true);

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .maybeSingle<Player>();

      if (!error && data) setPlayer(data);

      setLoading(false);
    }

    loadPlayer();

    // Live updates for this specific player
    const channel = supabase
      .channel(`player-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `id=eq.${playerId}`,
        },
        (payload) => {
          if (payload.new) setPlayer(payload.new as Player);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel); 
    };
  }, [playerId]);

  if (loading) {
    return (
      <CampFrame>
        <main className="p-6 max-w-3xl mx-auto pt-[200px]">
          Loading player…
        </main>
      </CampFrame>
    );
  }  

  if (!player) {
    return (
      <CampFrame>
        <main className="p-6">
          <h1 className="text-2xl font-bold mb-4">Player not found</h1>
          <Link href="/join" className="text-blue-600 underline">
            Join the game
          </Link>
        </main>
      </CampFrame>
    );
  }

  return (
    <CampFrame>
      <main className="p-6 max-w-3xl mx-auto space-y-6">

        {/* Personal Player Panel */}
        <section className="p-4 bg-white rounded shadow space-y-2">
          <h1 className="text-3xl font-bold">Welcome, {player.name}!</h1>
          <div className="flex items-center gap-2">
            <span>Team:</span>
            <span
              className="px-3 py-1 rounded-full text-white text-sm font-semibold"
              style={{ backgroundColor: getTeamColor(player.team) }}
            >
              {player.team}
            </span>
          </div>
          <p className="text-xl font-semibold">Your Points: {player.points}</p>
        </section>

        {/* Live Scoreboard underneath */}
        <Scoreboard />

        {/* Navigation */}
        <section className="space-x-4">
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Back to Scoreboard Only
          </Link>
          <Link
            href="/join"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
          >
            Switch Player
          </Link>
        </section>
      </main>
    </CampFrame>
  );
}
