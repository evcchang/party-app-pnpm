"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Scoreboard from "../../components/Scoreboard";
import { supabase } from "../../../lib/supabaseClient";
import { getTeamColor } from "../../../lib/getTeamColor";
import { usePlayerGameModeRedirect } from "../../hooks/usePlayerGameModeRedirect";
import CampFrame from "../../components/CampFrame";

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

type Player = {
  id: string;
  name: string;
  team: string;
  points: number;
};

type SideQuest = {
  id: string;
  prompt: string;
  points: number;
  assignedAt: string;
};

const SWITCH_COOLDOWN_MINUTES = 10;

export default function PlayerDashboard({
  params,
}: {
  params: { id: string };
}) {
  const playerId = params.id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const [sideQuest, setSideQuest] = useState<SideQuest | null>(null);
  const [sideQuestLoading, setSideQuestLoading] = useState(true);
  const [sideQuestError, setSideQuestError] = useState<string | null>(null);
  const [sideQuestActionLoading, setSideQuestActionLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // useEffect(() => {
  //   async function loadHistory() {
  //     setHistoryLoading(true);
  //     const res = await fetch(`/api/side-quest/history?playerId=${playerId}`);
  //     const data = await res.json();
  //     if (res.ok) setHistory(data.history || []);
  //     setHistoryLoading(false);
  //   }

  //   loadHistory();
  // }, [playerId]);

  usePlayerGameModeRedirect(playerId, "normal");

  // Keep "now" ticking so we can recompute the cooldown UI
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load player + subscribe for live updates
  useEffect(() => {
    async function loadPlayer() {
      setLoading(true);

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .maybeSingle<Player>();

      if (!error && data) setPlayer(data);

      setLoading(false);
    }

    loadPlayer();

    const channel = supabase
      .channel(`player-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `id=eq.${playerId}`,
        },
        (payload) => {
          if (payload.new) setPlayer(payload.new as Player);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  // // Load / auto-assign side quest
  // useEffect(() => {
  //   async function loadSideQuest() {
  //     setSideQuestLoading(true);
  //     setSideQuestError(null);

  //     try {
  //       const res = await fetch(`/api/side-quest?playerId=${playerId}`);
  //       const data = await res.json();

  //       if (!res.ok) {
  //         throw new Error(data.error ?? "Failed to load side quest");
  //       }

  //       setSideQuest(data.sideQuest);
  //     } catch (err: any) {
  //       console.error(err);
  //       setSideQuestError(err.message ?? "Failed to load side quest");
  //     } finally {
  //       setSideQuestLoading(false);
  //     }
  //   }

  //   loadSideQuest();
  // }, [playerId]);

  // async function handleSideQuestAction(action: "complete" | "switch") {
  //   if (!player) return;

  //   setSideQuestActionLoading(true);
  //   setSideQuestError(null);

  //   try {
  //     const res = await fetch("/api/side-quest", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ playerId: player.id, action }),
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       throw new Error(data.error ?? "Failed to update side quest");
  //     }

  //     setSideQuest(data.sideQuest);
  //   } catch (err: any) {
  //     console.error(err);
  //     setSideQuestError(err.message ?? "Failed to update side quest");
  //   } finally {
  //     setSideQuestActionLoading(false);
  //   }
  // }

  // const minutesSinceAssigned = (() => {
  //   if (!sideQuest?.assignedAt) return 0;
  //   const assignedTs = new Date(sideQuest.assignedAt).getTime();
  //   const diffMs = now - assignedTs;
  //   return diffMs > 0 ? diffMs / 60000 : 0;
  // })();

  // const canSwitch =
  //   !!sideQuest && minutesSinceAssigned >= SWITCH_COOLDOWN_MINUTES;

  // const minutesLeftToSwitch = Math.max(
  //   0,
  //   Math.ceil(SWITCH_COOLDOWN_MINUTES - minutesSinceAssigned)
  // );

  if (loading) {
    return (
      <CampFrame>
        <main className="p-6 max-w-3xl mx-auto pt-[200px]">
          Loading player…
        </main>
      </CampFrame>
    );
  }

  if (!player) {
    return (
      <CampFrame>
        <main className="p-6">
          <h1 className="text-2xl font-bold mb-4">Player not found</h1>
          <Link href="/join" className="text-blue-600 underline">
            Join the game
          </Link>
        </main>
      </CampFrame>
    );
  }

  return (
    <CampFrame>
      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Personal Player Panel */}
        <section className="p-4 bg-white rounded shadow space-y-2">
          <h1 className="text-3xl font-bold">Welcome, {player.name}!</h1>
          <div className="flex items-center gap-2">
            <span>Team:</span>
            <span
              className="px-3 py-1 rounded-full text-white text-sm font-semibold"
              style={{ backgroundColor: getTeamColor(player.team) }}
            >
              {player.team}
            </span>
          </div>
          <p className="text-xl font-semibold">
            Your Points: {player.points}
          </p>
        </section>

        {/* Live Scoreboard underneath */}
        <Scoreboard />

        {/* Navigation */}
        <section className="space-x-4">
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Back to Scoreboard Only
          </Link>
          <Link
            href="/join"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
          >
            Switch Player
          </Link>
        </section>
      </main>
    </CampFrame>
  );
}
