"use client";

import { useEffect, useState } from "react";
import CampFrame from "../components/CampFrame";
import Link from "next/link";
import Scoreboard from "../components/Scoreboard";
import AdminActiveSideQuests from "./components/AdminActiveSideQuests";
import { supabase } from "../../lib/supabaseClient";

type Player = {
  id: string;
  name: string;
  team: string;
  points: number;
};

export default function AdminDashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPlayers() {
    setLoading(true);

    const { data } = await supabase
      .from("players")
      .select("*")
      .order("points", { ascending: false });

    setPlayers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();

    // Subscribe to live player score updates
    const channel = supabase
      .channel("players-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => loadPlayers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <CampFrame>
      <main className="p-6 space-y-10 max-w-5xl mx-auto">
        <header className="flex justify-between items-center">
          <h1 className="text-4xl font-extrabold">Admin Dashboard</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Back Home
          </Link>
        </header>

        {/* 🔥 NEW FEATURE: ACTIVE SIDE QUESTS TABLE */}
        <AdminActiveSideQuests />

        {/* Existing Scoreboard */}
        <section>
          <h2 className="text-2xl font-bold mb-3">Scoreboard</h2>
          <Scoreboard />
        </section>

        {/* Manage Players */}
        <section className="bg-white rounded shadow p-4 space-y-4">
          <h2 className="text-2xl font-bold">Players</h2>

          {loading && <p>Loading players…</p>}

          {!loading && players.length === 0 && (
            <p>No players have joined yet.</p>
          )}

          {!loading && players.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Team</th>
                  <th className="text-left py-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b">
                    <td className="py-2">{player.name}</td>
                    <td className="py-2">{player.team}</td>
                    <td className="py-2">{player.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Add more admin tools here later */}
      </main>
    </CampFrame>
  );
}
