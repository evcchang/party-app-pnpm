"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Hourglass from "./Hourglass";

type TeamScore = {
  team: string;
  points: number;
};

export default function Scoreboard() {
  const [scores, setScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        .sort((a, b) => b.points - a.points); // highest → lowest

      setScores(aggregated);
      setLoading(false);
    }

    loadScores();

    const channel = supabase
      .channel("scoreboard-grid")
      .on(
        "postgres_changes",
        { schema: "public", table: "players" },
        () => loadScores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <p>Loading scoreboard…</p>;

  const maxPoints = 100;

  return (
    <div className="mt-6 w-full px-4">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Live Scoreboard
      </h2>

      {/* Grid container with 1–3 columns depending on screen */}
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
            className="flex flex-col items-center w-full"
          >
            {/* Team Name (above hourglass) */}
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

            {/* Points (below hourglass) */}
            <div className="text-lg font-bold mt-2">
              {teamData.points} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
