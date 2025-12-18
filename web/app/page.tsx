"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

import Scoreboard from "./components/Scoreboard";
import JeopardyBoard from "./components/JeopardyBoard";
import BuzzOrderPublic from "./components/BuzzOrderPublic";

import "./globals.css";
import FamilyFeudBoardPublic from "./components/FamilyFeudBoardPublic";
import { FeudRound, FeudAnswer } from "@/app/types/familyFeud";
import SnowFrame from "./components/SnowFrame";

type GameStateRow = {
  game_mode: string;
  selected_question: string | null;
};

type Question = {
  id: string;
  category: string;
  value: number;
  question: string;
  used: boolean;
};

type Buzz = {
  id: string;
  player_id: string;
  player_name: string;
  team: string;
  question_id: string;
  created_at: string;
};

export default function HomePage() {
  const [gameState, setGameState] = useState<GameStateRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const [feudRound, setFeudRound] = useState<FeudRound | null>(null);
  const [feudAnswers, setFeudAnswers] = useState<FeudAnswer[]>([]);
  const [flashStrike, setFlashStrike] = useState<number | null>(null);

  const [buzzes, setBuzzes] = useState<Buzz[]>([]);

  const mode = gameState?.game_mode ?? "normal";

  //
  // Helper: load active feud round + answers + FEUD BUZZES
  //
  async function loadFeudRoundAndAnswers() {
    const { data: round } = await supabase
      .from("family_feud_rounds")
      .select("*")
      .eq("active", true)
      .maybeSingle<FeudRound>();

    setFeudRound(round || null);

    if (round) {
      // Load answers
      const { data: answers } = await supabase
        .from("family_feud_answers")
        .select("*")
        .eq("round_id", round.id)
        .order("points", { ascending: false });

      setFeudAnswers((answers || []) as FeudAnswer[]);

      // Load FEUD buzzes
      const { data: bz } = await supabase
        .from("buzzes")
        .select("*")
        .eq("question_id", round.id)
        .order("created_at", { ascending: true });

      setBuzzes((bz || []) as Buzz[]);
    } else {
      setFeudAnswers([]);
      setBuzzes([]);
    }
  }

  //
  // Initial load + game_state subscription
  //
  useEffect(() => {
    async function init() {
      const { data: state } = await supabase
        .from("game_state")
        .select("game_mode, selected_question")
        .eq("id", "global")
        .maybeSingle<GameStateRow>();

      setGameState(state || null);

      // JEOPARDY initial load
      if (state?.game_mode === "jeopardy") {
        const { data: qs } = await supabase
          .from("jeopardy_questions")
          .select("*")
          .order("category")
          .order("value");

        setQuestions((qs || []) as Question[]);

        if (state.selected_question) {
          const q = (qs || []).find((x) => x.id === state.selected_question) || null;
          setCurrentQuestion(q);

          const { data: bz } = await supabase
            .from("buzzes")
            .select("*")
            .eq("question_id", state.selected_question)
            .order("created_at", { ascending: true });

          setBuzzes((bz || []) as Buzz[]);
        }
      }

      // FAMILY FEUD initial load
      if (state?.game_mode === "familyfeud") {
        await loadFeudRoundAndAnswers();
      }
    }

    init();

    //
    // Listen to game state changes
    //
    const stateChannel = supabase
      .channel("game-state-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        async (payload) => {
          const newState = payload.new as GameStateRow;
          setGameState(newState);

          if (newState.game_mode === "jeopardy") {
            const { data: qs } = await supabase
              .from("jeopardy_questions")
              .select("*")
              .order("category")
              .order("value");

            setQuestions((qs || []) as Question[]);

            if (newState.selected_question) {
              const q = (qs || []).find((x) => x.id === newState.selected_question) || null;
              setCurrentQuestion(q);

              const { data: bz } = await supabase
                .from("buzzes")
                .select("*")
                .eq("question_id", newState.selected_question)
                .order("created_at", { ascending: true });

              setBuzzes((bz || []) as Buzz[]);
            } else {
              setCurrentQuestion(null);
              setBuzzes([]);
            }
          } else if (newState.game_mode === "familyfeud") {
            await loadFeudRoundAndAnswers();
            setCurrentQuestion(null);
            setQuestions([]);
          } else {
            setCurrentQuestion(null);
            setBuzzes([]);
            setFeudRound(null);
            setFeudAnswers([]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stateChannel);
    };
  }, []);

  //
  // Live BUZZ subscription for BOTH modes
  //
  useEffect(() => {
    const channel = supabase
      .channel("home-buzzer-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "buzzes" },
        (payload) => {
          const newBuzz = payload.new as Buzz;
          const oldBuzz = payload.old as Buzz;
      
          // Handle INSERT (existing logic)
          if (payload.eventType === "INSERT") {
            if (mode === "jeopardy" && gameState?.selected_question === newBuzz.question_id) {
              setBuzzes((prev) => [...prev, newBuzz]);
              return;
            }
            if (mode === "familyfeud" && feudRound?.id === newBuzz.question_id) {
              setBuzzes((prev) => [...prev, newBuzz]);
              return;
            }
          }
      
          // NEW → Handle DELETE (admin clears buzzes)
          if (payload.eventType === "DELETE") {
            // If ANY deletion happens, simply clear the buzz list locally
            setBuzzes([]);
            return;
          }
        }
      )      
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, gameState?.selected_question, feudRound?.id]);

  //
  // FAMILY FEUD realtime: round + answers + strike flash
  //
  useEffect(() => {
    if (mode !== "familyfeud") return;

    const channel = supabase
      .channel("family-feud-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_rounds" },
        async (payload) => {
          const newRound = payload.new as FeudRound;

          // Strike flash
          if (feudRound && newRound.strikes > feudRound.strikes) {
            setFlashStrike(newRound.strikes);
            setTimeout(() => setFlashStrike(null), 3000);
          }

          // If round changed, reset buzzes
          if (feudRound?.id !== newRound.id) {
            setBuzzes([]);
          }

          await loadFeudRoundAndAnswers();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_answers" },
        async () => {
          if (!feudRound) return;

          const { data: answers } = await supabase
            .from("family_feud_answers")
            .select("*")
            .eq("round_id", feudRound.id)
            .order("points", { ascending: false });

          setFeudAnswers((answers || []) as FeudAnswer[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, feudRound?.id]);

  //
  // Detect when a Family Feud round becomes active
  //
  useEffect(() => {
    if (mode !== "familyfeud") return;

    const channel = supabase
      .channel("feud-round-activation-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "family_feud_rounds" },
        async (payload) => {
          const newRow = payload.new as FeudRound;

          // Only reload when a row becomes active
          if (newRow.active === true) {
            await loadFeudRoundAndAnswers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode]);


  //
  // RENDER
  //
  return (
    <SnowFrame density={60}>
      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Party Game</h1>
          <Link
            href="/join"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            Join the Game
          </Link>
        </header>

        {/* NORMAL MODE */}
        {mode === "normal" && (
          <>
            <Scoreboard />
            <div className="mt-4 text-xs text-right text-gray-400">
              Jeopardy mode is currently off.
            </div>
          </>
        )}

        {/* JEOPARDY MODE */}
        {mode === "jeopardy" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LEFT SIDE */}
              <div className="md:col-span-2 space-y-4">
                {currentQuestion ? (
                  <section className="p-4 border rounded bg-gray-900 text-white">
                    <h2 className="text-xl font-bold mb-2">Current Question</h2>
                    <p className="text-sm text-gray-300">
                      {currentQuestion.category} – {currentQuestion.value}
                    </p>
                    <p className="mt-4 text-lg">{currentQuestion.question}</p>
                  </section>
                ) : (
                  <section>
                    <p className="mb-2 text-sm text-gray-600">
                      Jeopardy is in progress. Waiting for a question…
                    </p>
                    <JeopardyBoard questions={questions} disabled={true} />
                  </section>
                )}
              </div>

              {/* BUZZ ORDER */}
              <div className="md:col-span-1">
                <BuzzOrderPublic buzzes={buzzes} />
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4">Scoreboard</h2>
              <Scoreboard />
            </div>
          </>
        )}

        {/* FAMILY FEUD MODE */}
        {mode === "familyfeud" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {flashStrike && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                  <div className="text-red-600 font-extrabold text-[200px] drop-shadow-2xl animate-pop">
                    {Array(flashStrike).fill("X").join("")}
                  </div>
                </div>
              )}

              {/* FEUD BOARD */}
              <div className="md:col-span-2">
                <FamilyFeudBoardPublic
                  round={feudRound}
                  answers={feudAnswers}
                />
              </div>

              {/* FEUD BUZZ ORDER */}
              <div className="md:col-span-1">
                <BuzzOrderPublic buzzes={buzzes} />
              </div>
            </div>

            {/* SCOREBOARD */}
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4">Scoreboard</h2>
              <Scoreboard />
            </div>
          </>
        )}

        {/* FOOTER */}
        <div className="mt-4 text-right">
          <Link
            href="/admin/login"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Admin login
          </Link>
        </div>
      </main>
    </SnowFrame>
  );
}
