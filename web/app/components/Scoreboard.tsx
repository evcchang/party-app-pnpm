"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Hourglass from "./Hourglass";
import Crown from "./Crown";

type TeamScore = {
  team: string;
  points: number;
};

export default function Scoreboard() {
  const [scores, setScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadScores() {
    setLoading(true);

    const { data } = await supabase
      .from("players")
      .select("team, points");

    const totals = new Map<string, number>();

    (data ?? []).forEach((p) => {
      totals.set(p.team, (totals.get(p.team) ?? 0) + p.points);
    });

    const aggregated = Array.from(totals.entries())
      .map(([team, points]) => ({ team, points }))
      .sort((a, b) => b.points - a.points);

    setScores(aggregated);
    setLoading(false);
  }

  useEffect(() => {
    loadScores();

    // ⭐ STRONGER REALTIME SUBSCRIPTION ⭐
    const channel = supabase
      .channel("scoreboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",                // <— important: react to INSERT/UPDATE/DELETE
          schema: "public",
          table: "players",
        },
        async () => {
          await loadScores();        // reload totals on ANY change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <p>Loading scoreboard…</p>;

  // You can adjust maxPoints or compute based on leader
  const maxPoints = 100;

  return (
    <div className="mt-6 w-full px-4">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Live Scoreboard
      </h2>

      <div
        className="
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          gap-6 
          justify-items-center
        "
      >
        {scores.map((teamData, index) => (
          <div
            key={teamData.team}
            className="relative flex flex-col items-center w-full pt-6"
          >
            {/* Leader Crown */}
            {index === 0 && (
              <Crown
                size={32}
                color="gold"
                className="absolute -top-1"
              />
            )}

            {/* Team Name */}
            <div className="text-xl font-semibold mb-2">
              {teamData.team}
            </div>

            {/* Hourglass */}
            <Hourglass
              team={teamData.team}
              points={teamData.points}
              maxPoints={maxPoints}
              isLeader={index === 0}
            />

            {/* Team Points */}
            <div className="text-lg font-bold mt-2">
              {teamData.points} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
