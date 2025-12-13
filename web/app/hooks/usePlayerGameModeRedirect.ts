"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

/**
 * playerId     - string id of the player
 * gameType     - the game this page represents ("jeopardy", "normal", etc)
 *
 * When global game_state changes:
 * - If game_mode === gameType → stay on this page
 * - If game_mode !== gameType:
 *    - If normal → redirect to /player/[id]
 *    - If jeopardy → redirect to /player/[id]/jeopardy
 *    - Future games supported easily
 */
export function usePlayerGameModeRedirect(
  playerId: string | undefined,
  gameType: "normal" | "jeopardy" | string
) {
  const router = useRouter();

  useEffect(() => {
    if (!playerId) return;

    const channel = supabase
      .channel(`player-game-mode-${playerId}-${gameType}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state" },
        (payload) => {
          const state = payload.new as {
            game_mode: string;
            selected_question: string | null;
          };

          // If the global game mode is the same as this page → stay here
          if (state.game_mode === gameType) {
            return;
          }

          // If Jeopardy just started
          if (state.game_mode === "jeopardy") {
            router.replace(`/player/${playerId}/jeopardy`);
            return;
          }

          // Family Feud mode
          if (state.game_mode === "familyfeud") {
            router.push(`/player/${playerId}/family-feud`);
          }

          // If Normal game mode
          if (state.game_mode === "normal") {
            router.replace(`/player/${playerId}`);
            return;
          }

          // Fallback for future games:
          router.replace(`/player/${playerId}/${state.game_mode}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, gameType, router]);
}
