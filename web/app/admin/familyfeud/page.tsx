"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { FeudRound, FeudAnswer } from "@/app/types/familyFeud";

export default function AdminFamilyFeudPage() {
  const [round, setRound] = useState<FeudRound | null>(null);
  const [answers, setAnswers] = useState<FeudAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  //
  // LOAD TEAMS
  //
  useEffect(() => {
    async function loadTeams() {
      const { data, error } = await supabase
        .from("players")
        .select("team");

      if (!error && data) {
        const uniqueTeams = [...new Set(data.map((p) => p.team).filter(Boolean))];
        setTeams(uniqueTeams);
      }
    }
    loadTeams();
  }, []);

  //
  // LOAD ACTIVE ROUND & ANSWERS
  //
  async function loadRound() {
    setLoading(true);

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
    } else {
      setAnswers([]);
    }

    setLoading(false);
  }

  //
  // END FAMILY FEUD MODE
  //
  async function endFamilyFeud() {
    await supabase
      .from("game_state")
      .update({ game_mode: "normal", selected_question: null })
      .eq("id", "global");

    await supabase
      .from("family_feud_rounds")
      .update({ active: false, strikes: 0 })
      .gte("strikes", 0);

    await supabase.from("buzzes").delete().gte("created_at", "1900-01-01");

    await supabase
      .from("family_feud_answers")
      .update({ revealed: false })
      .gte("points", 0);

    window.location.href = "/admin";
  }

  //
  // CLEAR BUZZES — NEW BUTTON
  //
  async function clearBuzzes() {
    const { error } = await supabase
      .from("buzzes")
      .delete()
      .gte("created_at", "1900-01-01");

    if (error) console.error("Clear buzzes error:", error);

    window.location.reload();
  }

  //
  // NEXT ROUND
  //
  async function nextRound() {
    const { data: current } = await supabase
      .from("family_feud_rounds")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    const { data: inactive } = await supabase
      .from("family_feud_rounds")
      .select("*")
      .eq("active", false);

    if (!inactive || inactive.length === 0) {
      alert("No inactive rounds available!");
      return;
    }

    const next = inactive[Math.floor(Math.random() * inactive.length)];

    if (current) {
      await supabase
        .from("family_feud_rounds")
        .update({ active: false })
        .eq("id", current.id);
    }

    await supabase
      .from("family_feud_rounds")
      .update({ active: true, strikes: 0 })
      .eq("id", next.id);

    await supabase.from("buzzes").delete().gte("created_at", "1900-01-01");

    window.location.reload();
  }

  //
  // ACTIONS
  //
  async function revealAnswer(id: string) {
    await fetch("/api/family-feud/reveal-answer", {
      method: "POST",
      body: JSON.stringify({ answerId: id }),
    });

    window.location.reload();
  }

  async function addStrike(roundId: string) {
    await fetch("/api/family-feud/add-strike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId }),
    });

    window.location.reload();
  }

  async function awardPoints(roundId: string, teamId: string) {
    await fetch("/api/family-feud/award-points", {
      method: "POST",
      body: JSON.stringify({ roundId, teamId }),
    });
  }

  //
  // SUBSCRIPTIONS
  //
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

  //
  // RENDER
  //
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

        <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
          {answers.map((ans) => (
            <div
              key={ans.id}
              className="bg-blue-900 text-white p-4 rounded text-xl flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-semibold">{ans.answer}</span>
                <span className="text-sm opacity-80">{ans.points} points</span>
              </div>

              {!ans.revealed ? (
                <button
                  onClick={() => revealAnswer(ans.id)}
                  className="bg-yellow-400 text-black px-3 py-1 rounded text-sm font-bold hover:bg-yellow-300"
                >
                  Reveal
                </button>
              ) : (
                <span className="bg-green-600 px-3 py-1 rounded text-sm font-semibold">
                  Revealed
                </span>
              )}
            </div>
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

        <button onClick={() => addStrike(round.id)}>
          Add Strike
        </button>

        {/* NEW: CLEAR BUZZES BUTTON */}
        <button
          onClick={clearBuzzes}
          className="ml-4 bg-red-700 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Clear Buzzes
        </button>
      </section>

      {/* AWARD POINTS */}
      <section>
        <h3 className="text-lg font-bold mb-2">Award Points</h3>

        <select onChange={(e) => setSelectedTeam(e.target.value)}>
          <option value="">Select team</option>
          {teams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </section>

      <section>
        <button
          disabled={!selectedTeam}
          onClick={() => awardPoints(round.id, selectedTeam)}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded text-lg"
        >
          Award Points to {selectedTeam}
        </button>
      </section>

      {/* NEXT ROUND */}
      <section>
        <button
          onClick={nextRound}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-500"
        >
          Next Round
        </button>
      </section>

      {/* END GAME */}
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
