"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import JeopardyBoard from "../../components/JeopardyBoard";

type Question = {
  id: string;
  category: string;
  value: number;
  question: string;
  answer: string;
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


export default function AdminJeopardyPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [buzzes, setBuzzes] = useState<Buzz[]>([]);
  const [customPoints, setCustomPoints] = useState<number>(0);

  // load questions + selected question
  useEffect(() => {
    async function loadInitial() {
      const { data: qs } = await supabase
        .from("jeopardy_questions")
        .select("*")
        .order("category", { ascending: true })
        .order("value", { ascending: true });

      setQuestions((qs || []) as Question[]);

      const { data: state } = await supabase
        .from("game_state")
        .select("selected_question")
        .eq("id", "global")
        .maybeSingle();

      if (state?.selected_question) {
        const q = (qs || []).find((x) => x.id === state.selected_question) || null;
        setSelectedQuestion(q);
        if (q) loadBuzzes(q.id);
      }
    }

    async function loadBuzzes(questionId: string) {
      const { data } = await supabase
        .from("buzzes")
        .select("*")
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });
      setBuzzes((data || []) as Buzz[]);
    }

    loadInitial();

    // subscribe to game_state changes
    const stateChannel = supabase
      .channel("game-state-admin-jeopardy")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        async (payload) => {
          const newState = payload.new as { selected_question: string | null };
          if (newState.selected_question) {
            const q = questions.find((x) => x.id === newState.selected_question) || null;
            setSelectedQuestion(q);
            if (q) loadBuzzes(q.id);
          } else {
            setSelectedQuestion(null);
            setBuzzes([]);
          }
        }
      )
      .subscribe();

    // subscribe to buzzes
    const buzzChannel = supabase
      .channel("buzzes-admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "buzzes" },
        (payload) => {
          const buzz = payload.new as Buzz;
          setBuzzes((prev) => [...prev, buzz]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stateChannel);
      supabase.removeChannel(buzzChannel);
    };
  }, [questions]);

  async function handleSelectQuestion(id: string) {
    await fetch("/api/game/select-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: id }),
    });
  }

  async function handleClearQuestion() {
    await fetch("/api/game/clear-question", { method: "POST" });
  }

  async function handleEndJeopardy() {
    await fetch("/api/game/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "normal" }),
    });

    window.location.href = "/admin";
  }

  async function awardPoints(playerId: string, amount: number) {
    if (!playerId || !amount) return;
  
    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, delta: amount })
    });
  
    if (res.ok) {
      console.log(`Added ${amount} points to player ${playerId}`);
    } else {
      console.error("Failed to award points:", await res.text());
      alert("Failed to add points.");
    }
  }  

  async function resetBuzzers() {
    if (!selectedQuestion?.id) return;
  
    const { error } = await supabase
      .from("buzzes")
      .delete()
      .eq("question_id", selectedQuestion.id);
  
    if (!error) {
      setBuzzes([]);
    } else {
      console.error("Failed to reset buzzers", error);
      alert("Failed to reset buzzers.");
    }
  }  

  return (
    <main className="p-4 max-w-6xl mx-auto space-y-4">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Jeopardy Control</h1>
        <button
          onClick={handleEndJeopardy}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          End Jeopardy
        </button>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-2">Board</h2>
        <JeopardyBoard questions={questions} disabled={false} onSelect={handleSelectQuestion} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">Current Question</h2>
          {selectedQuestion ? (
            <>
              <p className="font-bold">
                {selectedQuestion.category} – {selectedQuestion.value}
              </p>
              <p className="mt-2">{selectedQuestion.question}</p>
              <p className="mt-2 text-sm text-gray-500">
                Answer: {selectedQuestion.answer}
              </p>
              <button
                onClick={handleClearQuestion}
                className="mt-4 px-3 py-2 bg-gray-800 text-white rounded"
              >
                Back to Board
              </button>
            </>
          ) : (
            <p>No question selected.</p>
          )}
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2 flex items-center justify-between">
            <span>Buzz Order</span>
            {selectedQuestion && (
              <button
                onClick={resetBuzzers}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Reset Buzzers
              </button>
            )}
          </h2>
          {buzzes.length === 0 ? (
            <p>No buzzes yet.</p>
          ) : (
            <ol className="list-decimal list-inside space-y-4">
              {buzzes.map((b, idx) => (
                <li key={b.id} className="flex flex-col gap-2 p-2 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.player_name}</span>
                    <span className="text-sm text-gray-600">({b.team})</span>
                  </div>

                  {/* Default buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {[5, 10, 15, 20, 25].map((value) => (
                      <button
                        key={value}
                        onClick={() => awardPoints(b.player_id, value)}
                        className="px-2 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-800"
                      >
                        +{value}
                      </button>
                    ))}
                  </div>

                  {/* Custom amount entry */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(Number(e.target.value))}
                      placeholder="Custom"
                      className="w-20 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded text-sm"
                    />
                    <button
                      onClick={() => awardPoints(b.player_id, customPoints)}
                      disabled={!customPoints || customPoints <= 0}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-500"
                    >
                      Add
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Use the regular admin page to award points to the correct player.
          </p>
        </div>
      </section>
    </main>
  );
}
