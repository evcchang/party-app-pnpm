import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

const SWITCH_COOLDOWN_MINUTES = 10;

async function fetchNeverUsedSideQuests(supabase: any, playerId: string) {
  // Find all previously used quest IDs
  const { data: pastAssignments } = await supabase
    .from("player_side_quests")
    .select("side_quest_id")
    .eq("player_id", playerId);

  const usedIds = (pastAssignments ?? []).map((p) => p.side_quest_id);

  // Find quests currently active (cannot assign)
  const { data: activeAssignments } = await supabase
    .from("player_side_quests")
    .select("side_quest_id")
    .eq("active", true);

  const activeIds = (activeAssignments ?? []).map((p) => p.side_quest_id);

  // Combine exclusion
  const combined = [...new Set([...usedIds, ...activeIds])];

  let query = supabase.from("side_quests").select("id, prompt, points");

  if (combined.length > 0) {
    query = query.not("id", "in", `(${combined.join(",")})`);
  }

  const { data: available } = await query;

  return available ?? [];
}

function minutesSince(dateString: string) {
  return (Date.now() - new Date(dateString).getTime()) / 60000;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) return NextResponse.json({ error: "Missing playerId" }, { status: 400 });

  const supabase = createServerSupabase();

  // Check if player already has active quest
  const { data: existing } = await supabase
    .from("player_side_quests")
    .select("id, assigned_at, side_quests(id, prompt, points)")
    .eq("player_id", playerId)
    .eq("active", true)
    .maybeSingle();

  if (existing?.side_quests) {
    return NextResponse.json({
      sideQuest: {
        id: existing.side_quests.id,
        prompt: existing.side_quests.prompt,
        points: existing.side_quests.points,
        assignedAt: existing.assigned_at,
      }
    });
  }

  // Auto-assign a new unique quest
  const available = await fetchNeverUsedSideQuests(supabase, playerId);

  if (available.length === 0) {
    return NextResponse.json({ sideQuest: null });
  }

  const quest = available[Math.floor(Math.random() * available.length)];

  const { data: assigned } = await supabase
    .from("player_side_quests")
    .insert({
      player_id: playerId,
      side_quest_id: quest.id
    })
    .select("assigned_at")
    .single();

  return NextResponse.json({
    sideQuest: {
      id: quest.id,
      prompt: quest.prompt,
      points: quest.points,
      assignedAt: assigned.assigned_at,
    }
  });
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const body = await req.json();
  const { playerId, action } = body;

  if (!playerId || action !== "switch") {
    return NextResponse.json({ error: "Players can only switch quests" }, { status: 400 });
  }

  const { data: active } = await supabase
    .from("player_side_quests")
    .select("id, assigned_at")
    .eq("player_id", playerId)
    .eq("active", true)
    .maybeSingle();

  if (!active) {
    return NextResponse.json({ error: "No active quest to switch" }, { status: 400 });
  }

  const ms = minutesSince(active.assigned_at);
  if (ms < SWITCH_COOLDOWN_MINUTES) {
    return NextResponse.json(
      { error: `Switch available in ${Math.ceil(SWITCH_COOLDOWN_MINUTES - ms)} minutes` },
      { status: 400 }
    );
  }

  // Mark inactive
  await supabase
    .from("player_side_quests")
    .update({ active: false })
    .eq("id", active.id);

  // Assign a new one
  const available = await fetchNeverUsedSideQuests(supabase, playerId);

  if (available.length === 0) {
    return NextResponse.json({ sideQuest: null });
  }

  const quest = available[Math.floor(Math.random() * available.length)];

  const { data: assigned } = await supabase
    .from("player_side_quests")
    .insert({
      player_id: playerId,
      side_quest_id: quest.id
    })
    .select("assigned_at")
    .single();

  return NextResponse.json({
    sideQuest: {
      id: quest.id,
      prompt: quest.prompt,
      points: quest.points,
      assignedAt: assigned.assigned_at,
    }
  });
}
