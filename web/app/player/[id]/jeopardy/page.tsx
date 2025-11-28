"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { usePlayerGameModeRedirect } from "../../../hooks/usePlayerGameModeRedirect";

type Question = {
  id: string;
  category: string;
  value: number;
  question: string;
};

type GameStateRow = {
  game_mode: string;
  selected_question: string | null;
};

export default function PlayerJeopardyPage() {
  const params = useParams();
  const playerId = params.id as string | undefined;
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [buzzed, setBuzzed] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("");

  usePlayerGameModeRedirect(playerId, "jeopardy");
  
  // Load player info & game state / question
  useEffect(() => {
    async function init() {
      const { data: player } = await supabase
        .from("players")
        .select("id, name, team")
        .eq("id", playerId)
        .maybeSingle();
      if (player) {
        setPlayerName(player.name);
        setTeam(player.team);
      }

      const { data: state } = await supabase
        .from("game_state")
        .select("game_mode, selected_question")
        .eq("id", "global")
        .maybeSingle<GameStateRow>();

      if (state?.selected_question) {
        const { data: q } = await supabase
          .from("jeopardy_questions")
          .select("id, category, value, question")
          .eq("id", state.selected_question)
          .maybeSingle<Question>();
        if (q) setQuestion(q);
      }
    }

    init();

    // subscribe to game_state changes for question switching
    const channel = supabase
      .channel("game-state-player-jeopardy")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        async (payload) => {
          const newState = payload.new as GameStateRow;
          if (newState.selected_question) {
            const { data: q } = await supabase
              .from("jeopardy_questions")
              .select("id, category, value, question")
              .eq("id", newState.selected_question)
              .maybeSingle<Question>();
            setQuestion(q || null);
            setBuzzed(false);
          } else {
            setQuestion(null);
            setBuzzed(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  async function handleBuzz() {
    if (!question || buzzed || !playerId || !playerName || !team) return;

    const res = await fetch("/api/buzz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, playerName, team }),
    });

    if (res.ok) {
      setBuzzed(true);
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto text-center space-y-6">
      <h1 className="text-2xl font-bold">Jeopardy Buzzer</h1>
      {question ? (
        <>
          <p className="text-sm text-gray-600">
            {question.category} – {question.value}
          </p>
          <p className="font-semibold mt-2">{question.question}</p>
        </>
      ) : (
        <p>Waiting for the next question…</p>
      )}

      <button
        onClick={handleBuzz}
        disabled={!question || buzzed}
        className={`w-full h-32 rounded-full text-2xl font-bold ${
          buzzed
            ? "bg-gray-400 text-gray-800"
            : "bg-red-600 text-white active:bg-red-800"
        }`}
      >
        {buzzed ? "Buzzed!" : "BUZZ"}
      </button>
    </main>
  );
}
