"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type Player = {
  id: string;
  name: string;
  team: string;
  points: number;
};

export default function PlayerPage({ params }: { params: { id: string } }) {
  const playerId = params.id;
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlayer() {
      setLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .maybeSingle<Player>();

      if (error) {
        console.error("Error loading player:", error);
        setPlayer(null);
        setLoading(false);
        return;
      }

      setPlayer(data);
      setLoading(false);
    }

    loadPlayer();

    // subscribe to realtime updates for this specific player
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
          // payload.new contains the updated row
          if (payload.new) {
            setPlayer(payload.new as Player);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  if (loading) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <p>Loading player…</p>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Player not found</h1>
        <Link href="/join" className="text-blue-600 underline">
          Join the game
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4">Hi, {player.name}!</h1>
      <div className="space-y-2">
        <p>
          <span className="font-semibold">Team:</span> {player.team}
        </p>
        <p className="text-xl">
          <span className="font-semibold">Your points:</span> {player.points}
        </p>
      </div>

      <div className="mt-6 space-x-4">
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Scoreboard
        </Link>
        <Link
          href="/join"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
        >
          Switch Player
        </Link>
      </div>
    </main>
  );
}
