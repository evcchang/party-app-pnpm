"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { FeudRound, FeudAnswer } from "@/app/types/familyFeud";

export default function AdminFamilyFeudPage() {
  const [round, setRound] = useState<FeudRound | null>(null);
  const [answers, setAnswers] = useState<FeudAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  // Load active round
  async function loadRound() {
    const { data: r } = await supabase
      .from("family_feud_rounds")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    setRound(r || null);

    if (r) {
      const { data: ans } = await supabase
        .from("family_feud_answers")
        .select("*")
        .eq("round_id", r.id)
        .order("points", { ascending: false });

      setAnswers(ans || []);
    }
    setLoading(false);
  }

  // END FAMILY FEUD MODE
  async function endFamilyFeud() {
    // 1. Reset game mode to normal
    await supabase
    .from("game_state")
    .update({ game_mode: "normal", selected_question: null })
    .eq("id", "global");

    // 2. Deactivate all feud rounds
    await supabase
    .from("family_feud_rounds")
    .update({ active: false })
    .eq("active", true);

    // 3. Clear buzzes
    await supabase
    .from("buzzes")
    .delete()
    .neq("id", "-1"); // delete all rows

    // Optional: redirect admin back to dashboard
    window.location.href = "/admin";
  }
  

  useEffect(() => {
    loadRound();

    const channel = supabase
        .channel("admin-familyfeud")
        .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_rounds" },
        () => loadRound()
        )
        .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_answers" },
        () => loadRound()
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  // Reveal an answer
  async function revealAnswer(id: string) {
    await supabase
      .from("family_feud_answers")
      .update({ revealed: true })
      .eq("id", id);
  }

  // Add a strike
  async function addStrike() {
    if (!round) return;

    await supabase
      .from("family_feud_rounds")
      .update({ strikes: round.strikes + 1 })
      .eq("id", round.id);
  }

  // Award points to a team (using existing API)
  async function awardPoints(team: string, points: number) {
    await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team, delta: points }),
    });
  }

  if (loading) return <main className="p-6">Loading…</main>;

  if (!round)
    return (
      <main className="p-6 text-gray-500">
        No active Family Feud round. Create one or activate it in the admin dashboard.
      </main>
    );

  return (
    <main className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Admin Family Feud</h1>

      {/* QUESTION */}
      <section>
        <h2 className="text-xl font-bold mb-2">{round.question}</h2>
      </section>

      {/* ANSWERS */}
      <section>
        <h3 className="text-lg font-bold mb-2">Answers</h3>

        <div className="grid grid-cols-1 gap-3">
          {answers.map((ans) => (
            <button
              key={ans.id}
              onClick={() => revealAnswer(ans.id)}
              disabled={ans.revealed}
              className={`p-4 rounded text-white text-lg flex justify-between ${
                ans.revealed ? "bg-green-700" : "bg-blue-800"
              }`}
            >
              {ans.revealed ? (
                <>
                  <span>{ans.answer}</span>
                  <span>{ans.points}</span>
                </>
              ) : (
                <span>Reveal Answer</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* STRIKES */}
      <section className="space-y-2">
        <h3 className="text-lg font-bold">Strikes</h3>

        <div className="flex space-x-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`w-12 h-12 text-3xl font-bold border rounded flex items-center justify-center ${
                round.strikes >= n ? "bg-red-600 text-white" : "bg-gray-200"
              }`}
            >
              X
            </div>
          ))}
        </div>

        <button
          onClick={addStrike}
          className="px-6 py-3 bg-red-700 text-white rounded text-lg"
        >
          Add Strike
        </button>
      </section>

      {/* Award Points */}
      <section>
        <h3 className="text-lg font-bold mb-2">Award Points</h3>

        <div className="flex space-x-2">
          {["Red", "Blue", "Green", "Yellow", "Orange"].map((team) => (
            <button
              key={team}
              onClick={() => awardPoints(team, 10)}
              className="px-4 py-2 bg-purple-600 text-white rounded"
            >
              {team} +10
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <button
            onClick={endFamilyFeud}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded text-lg"
        >
            End Family Feud Mode
        </button>
      </section>
    </main>
  );
}
