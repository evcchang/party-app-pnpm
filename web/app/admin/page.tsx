"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import AdminActiveSideQuests from "./components/AdminActiveSideQuests"; // ← ADD THIS IMPORT

type Player = {
  id: string;
  name: string;
  team: string;
  points: number;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndLoad() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/admin/login");
        return;
      }

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .order("team", { ascending: true });

      if (playersError) {
        setError(playersError.message);
      } else {
        setPlayers(playersData as Player[]);
      }

      setLoading(false);
    }

    checkAuthAndLoad();
  }, [router]);

  async function changePoints(playerId: string, delta: number) {
    setError("");

    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, delta }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update points");
      return;
    }

    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .order("team", { ascending: true });

    setPlayers((playersData || []) as Player[]);
  }

  async function startJeopardy() {
    await fetch("/api/game/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "jeopardy" }),
    });
    window.location.href = "/admin/jeopardy";
  }

  async function startFamilyFeud() {
    // 1. Set game mode to family feud
    const { error: modeErr } = await supabase
      .from("game_state")
      .update({ game_mode: "familyfeud", selected_question: null })
      .eq("id", "global");
  
    if (modeErr) {
      console.error("Failed to set game mode:", modeErr);
      return;
    }
  
    // 2. Fetch all feud rounds
    const { data: rounds, error: loadErr } = await supabase
      .from("family_feud_rounds")
      .select("*");
  
    if (loadErr || !rounds || rounds.length === 0) {
      console.error("No rounds available:", loadErr);
      return;
    }
  
    // 3. Pick a random round
    const randomRound = rounds[Math.floor(Math.random() * rounds.length)];
  
    // 4. Activate the random round and reset strikes
    const { error: activateErr } = await supabase
      .from("family_feud_rounds")
      .update({ active: true, strikes: 0 })
      .eq("id", randomRound.id);
  
    if (activateErr) {
      console.error("Failed to activate random round:", activateErr);
      return;
    }
  
    // 5. Redirect to feud dashboard or reload UI
    window.location.href = "/admin/familyfeud";
  }  

  if (loading) {
    return <main className="p-6">Loading…</main>;
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <button
        onClick={startJeopardy}
        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded"
      >
        Start Jeopardy
      </button>

      <button
        onClick={startFamilyFeud}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Start Family Feud
      </button>


      {/* ⭐ NEW: Active Side Quests Panel */}
      <div className="mt-8 mb-6">
        <AdminActiveSideQuests />
      </div>

      <table className="table-auto border-collapse border border-gray-300 w-full">
        <thead>
          <tr>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Team</th>
            <th className="border px-2 py-1">Points</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td className="border px-2 py-1">{p.name}</td>
              <td className="border px-2 py-1">{p.team}</td>
              <td className="border px-2 py-1">{p.points}</td>
              <td className="border px-2 py-1">
                <button
                  onClick={() => changePoints(p.id, 1)}
                  className="bg-green-600 text-white px-2 py-1 rounded mr-1"
                >
                  +1
                </button>
                <button
                  onClick={() => changePoints(p.id, -1)}
                  className="bg-red-600 text-white px-2 py-1 rounded"
                >
                  -1
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
