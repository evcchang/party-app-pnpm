"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

import CampFrame from "./components/CampFrame";
import Scoreboard from "./components/Scoreboard";
import JeopardyBoard from "./components/JeopardyBoard";
import BuzzOrderPublic from "./components/BuzzOrderPublic";

import "./globals.css";
import FamilyFeudBoardPublic from "./components/FamilyFeudBoardPublic";
import { FeudRound, FeudAnswer } from "@/app/types/familyFeud";

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

  // NEW: live buzzer state
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);

  useEffect(() => {
    async function init() {
      // Load game state
      const { data: state } = await supabase
        .from("game_state")
        .select("game_mode, selected_question")
        .eq("id", "global")
        .maybeSingle<GameStateRow>();

      setGameState(state || null);

      // Load questions if in jeopardy mode
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

          // Load buzzes for current question
          const { data: bz } = await supabase
            .from("buzzes")
            .select("*")
            .eq("question_id", state.selected_question)
            .order("created_at", { ascending: true });

          setBuzzes((bz || []) as Buzz[]);
        }
      }

      if (state?.game_mode === "familyfeud") {
        // Load the active round
        const { data: round } = await supabase
          .from("family_feud_rounds")
          .select("*")
          .eq("active", true)
          .maybeSingle();
      
        setFeudRound(round || null);
      
        if (round) {
          const { data: answers } = await supabase
            .from("family_feud_answers")
            .select("*")
            .eq("round_id", round.id)
            .order("points", { ascending: false });
      
          setFeudAnswers((answers || []) as FeudAnswer[]);
        }
      }
    }

    init();

    //
    // 📡 LIVE GAME STATE SUBSCRIPTION
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
            // Reload questions
            const { data: qs } = await supabase
              .from("jeopardy_questions")
              .select("*")
              .order("category")
              .order("value");

            setQuestions((qs || []) as Question[]);

            // If a question is currently selected
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
            const { data: round } = await supabase
              .from("family_feud_rounds")
              .select("*")
              .eq("active", true)
              .maybeSingle();
          
            setFeudRound(round || null);
          
            if (round) {
              const { data: answers } = await supabase
                .from("family_feud_answers")
                .select("*")
                .eq("round_id", round.id)
                .order("points", { ascending: false });
          
              setFeudAnswers((answers || []) as FeudAnswer[]);
            }
          
            // Clear jeopardy UI
            setCurrentQuestion(null);
            setQuestions([]);
            setBuzzes([]);
          }
          else {
            // Normal mode turns everything off
            setCurrentQuestion(null);
            setBuzzes([]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stateChannel);
    };
  }, [gameState?.selected_question]);

  // 📡 BUZZES SUBSCRIPTION (always on)
  useEffect(() => {
    const channel = supabase
      .channel("home-buzzer-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "buzzes",
        },
        (payload) => {
          const newBuzz = payload.new as Buzz;

          // Only keep buzzes for current question
          setBuzzes((prev) => {
            if (gameState?.selected_question !== newBuzz.question_id) {
              return prev; // ignore unrelated buzzes
            }
            return [...prev, newBuzz];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState?.selected_question]);

  const mode = gameState?.game_mode ?? "normal";

  useEffect(() => {
    if (mode !== "familyfeud" || !feudRound) return;
  
    const channel = supabase
      .channel("family-feud-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_rounds" },
        async () => {
          // Reload the round info
          const { data: round } = await supabase
            .from("family_feud_rounds")
            .select("*")
            .eq("id", feudRound.id)
            .maybeSingle();
  
          setFeudRound(round);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_answers" },
        async () => {
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
  }, [mode, feudRound]);  

  return (
    <CampFrame>
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
            {/* TOP GRID: Jeopardy UI + Buzzer Order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LEFT side (board/question) */}
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
  
                <p className="mt-4 text-xs text-center text-gray-500">
                  Join the game and ask the host how to participate in Jeopardy!
                </p>
              </div>
  
              {/* RIGHT side (buzz order) */}
              <div className="md:col-span-1">
                <BuzzOrderPublic buzzes={buzzes} />
              </div>
            </div>
  
            {/* NEW SECTION: SCOREBOARD BELOW */}
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4">Scoreboard</h2>
              <Scoreboard />
            </div>
          </>
        )}

        {mode === "familyfeud" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* BOARD */}
              <div className="md:col-span-2">
                <FamilyFeudBoardPublic round={feudRound} answers={feudAnswers} />
              </div>

              {/* BUZZ ORDER */}
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
  
        <div className="mt-4 text-right">
          <Link
            href="/admin/login"
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Admin login
          </Link>
        </div>
      </main>
    </CampFrame>
  );
}
