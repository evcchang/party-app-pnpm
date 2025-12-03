"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminActiveSideQuests() {
  const [rows, setRows] = useState([]);

  async function load() {
    const { data } = await supabase
      .from("player_side_quests")
      .select(`
        id,
        assigned_at,
        player:player_id ( id, name, team ),
        quest:side_quest_id ( id, prompt, points )
      `)
      .eq("active", true);

    setRows(data ?? []);
  }

  async function complete(id: string, playerId: string, points: number) {
    await fetch("/api/admin/side-quest-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, playerId, points }),
    });

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="p-4 bg-white rounded shadow space-y-3">
      <h2 className="text-2xl font-bold mb-3">Active Side Quests</h2>

      {rows.length === 0 && <p>No active side quests.</p>}

      {rows.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Player</th>
              <th className="text-left py-2">Quest</th>
              <th className="text-left py-2">Points</th>
              <th className="text-left py-2">Assigned</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.player.name}</td>
                <td className="py-2">{r.quest.prompt}</td>
                <td className="py-2">{r.quest.points}</td>
                <td className="py-2">
                  {new Date(r.assigned_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td>
                  <button
                    className="px-3 py-1 bg-green-600 text-white rounded"
                    onClick={() =>
                      complete(r.id, r.player.id, r.quest.points)
                    }
                  >
                    Complete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
