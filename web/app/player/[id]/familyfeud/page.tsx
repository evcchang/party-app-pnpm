"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { FeudRound, FeudAnswer } from "@/app/types/familyFeud";

export default function FamilyFeudPage() {
  const [round, setRound] = useState<FeudRound | null>(null);
  const [answers, setAnswers] = useState<FeudAnswer[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadRound();

    // REALTIME SUBSCRIPTION (Supabase JS v1)
    const channel = supabase
      .channel("familyfeud")
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

  if (loading) return <main className="p-6">Loading…</main>;

  if (!round)
    return (
      <main className="p-6 text-center text-gray-500">
        Family Feud is active, but no round is currently live.
      </main>
    );

  return (
    <main className="flex flex-col items-center p-6 space-y-6">

      {/* QUESTION */}
      <h1 className="text-4xl font-bold text-center">{round.question}</h1>

      {/* ANSWERS */}
      <div className="grid grid-cols-1 gap-4 w-full max-w-2xl">
        {answers.map((ans) => (
          <div
            key={ans.id}
            className="bg-blue-800 text-white p-4 rounded text-center text-2xl"
          >
            {ans.revealed ? (
              <div className="flex justify-between px-4">
                <span>{ans.answer}</span>
                <span>{ans.points}</span>
              </div>
            ) : (
              <span>●●●●●</span>
            )}
          </div>
        ))}
      </div>

      {/* STRIKES */}
      <div className="flex space-x-4 mt-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`w-12 h-12 flex items-center justify-center text-3xl font-bold border rounded ${
              round.strikes >= n ? "bg-red-600 text-white" : "bg-gray-200"
            }`}
          >
            X
          </div>
        ))}
      </div>

      {/* BUZZ ORDER placeholder */}
      <div className="fixed right-4 top-1/3 bg-gray-900 text-white p-4 rounded">
        <h2 className="text-xl font-bold">Buzz Order</h2>
        {/* (You will integrate your buzz logic here) */}
      </div>

      {/* SCOREBOARD placeholder */}
      <div className="fixed bottom-0 w-full bg-black text-white p-4">
        {/* Insert Scoreboard component */}
      </div>

    </main>
  );
}
