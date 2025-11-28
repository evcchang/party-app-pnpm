"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type TeamScore = {
  team: string;
  points: number;
};

export default function HomePage() {
  const [scores, setScores] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScores() {
      setLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("team, points");

      if (error) {
        console.error("Error loading scores:", error);
        setLoading(false);
        return;
      }

      // aggregate points by team
      const map = new Map<string, number>();
      (data || []).forEach((row) => {
        const current = map.get(row.team) ?? 0;
        map.set(row.team, current + row.points);
      });

      const aggregated: TeamScore[] = Array.from(map.entries()).map(
        ([team, points]) => ({ team, points })
      );

      // sort by highest points first
      aggregated.sort((a, b) => b.points - a.points);

      setScores(aggregated);
      setLoading(false);
    }

    loadScores();

    // subscribe to changes on players table
    const channel = supabase
      .channel("players-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => {
          // Whenever a player row changes, reload scores
          loadScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Party Scoreboard</h1>

        {/* Join button for players */}
        <Link
          href="/join"
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          Join the Game
        </Link>
      </header>

      {loading ? (
        <p>Loading scores…</p>
      ) : scores.length === 0 ? (
        <p>No scores yet. Have players join and start earning points!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scores.map((team) => (
            <div
              key={team.team}
              className="bg-white rounded shadow p-4 flex items-center justify-between"
            >
              <div className="text-lg font-semibold">{team.team}</div>
              <div className="text-3xl font-bold">{team.points}</div>
            </div>
          ))}
        </div>
      )}

      {/* subtle admin login link */}
      <div className="mt-8 text-right">
        <Link
          href="/admin/login"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Admin login
        </Link>
      </div>
    </main>
  );
}
