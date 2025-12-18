"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import FamilyFeudBoardPublic from "../../../components/FamilyFeudBoardPublic";
import { FeudRound, FeudAnswer } from "@/app/types/familyFeud";
import { usePlayerGameModeRedirect } from "../../../hooks/usePlayerGameModeRedirect";
import SnowFrame from "@/app/components/SnowFrame";

export default function PlayerFamilyFeudPage() {
  const params = useParams();
  const playerId = params.id as string;
  const router = useRouter();

  const [round, setRound] = useState<FeudRound | null>(null);
  const [answers, setAnswers] = useState<FeudAnswer[]>([]);
  const [buzzed, setBuzzed] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("");

  // Redirect player if game mode changes (normal → back home, jeopardy → jeopardy page)
  usePlayerGameModeRedirect(playerId, "familyfeud");

  // Load player info + current feud round
  useEffect(() => {
    async function init() {
      // Load player info
      const { data: player } = await supabase
        .from("players")
        .select("id, name, team")
        .eq("id", playerId)
        .maybeSingle();

      if (player) {
        setPlayerName(player.name);
        setTeam(player.team);
      }

      // Load current active round
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
    }

    init();

    // Realtime subscription for feud updates
    const channel = supabase
      .channel("player-feud-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_rounds" },
        async () => {
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
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_feud_answers" },
        async () => {
          if (!round) return;

          const { data: ans } = await supabase
            .from("family_feud_answers")
            .select("*")
            .eq("round_id", round.id)
            .order("points", { ascending: false });

          setAnswers(ans || []);
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [playerId]);

  // BUZZ for feud
  async function handleFeudBuzz() {
    if (!round || buzzed || !playerId || !playerName || !team) return;

    const res = await fetch("/api/buzz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        playerName,
        team,
      }),
    });

    if (res.ok) {
      setBuzzed(true);
    }
  }

  return (
    <SnowFrame density={60}>
      <main className="p-6 max-w-md mx-auto space-y-6 text-center">
        <h1 className="text-2xl font-bold">Family Feud</h1>

        {/* Render the public feud board for the player */}
        <FamilyFeudBoardPublic round={round} answers={answers} />

        {/* Buzz Button */}
        <button
          onClick={handleFeudBuzz}
          disabled={!round || buzzed}
          className={`w-full h-32 rounded-full text-2xl font-bold ${
            buzzed
              ? "bg-gray-400 text-gray-800"
              : "bg-blue-600 text-white active:bg-blue-800"
          }`}
        >
          {buzzed ? "Buzzed!" : "BUZZ"}
        </button>
      </main>
    </SnowFrame>
  );
}
