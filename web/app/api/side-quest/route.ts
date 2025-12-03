import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/serverSupabase";

const SWITCH_COOLDOWN_MINUTES = 10;

// ---- Helper: unwrap Supabase relational array ----
function unwrapRelation<T>(value: T | T[]): T {
  return Array.isArray(value) ? value[0] : value;
}

function minutesSince(dateString: string): number {
  return (Date.now() - new Date(dateString).getTime()) / 60000;
}

// ---- Helper: fetch all quests this player can receive ----
async function getAvailableQuests(supabase: any, playerId: string) {
  // Past quests — don't reassign
  const { data: past } = await supabase
    .from("player_side_quests")
    .select("side_quest_id")
    .eq("player_id", playerId);

  const usedQuestIds = (past ?? []).map((x: any) => x.side_quest_id);

  // Quests currently assigned to ANY player
  const { data: active } = await supabase
    .from("player_side_quests")
    .select("side_quest_id")
    .eq("active", true);

  const activeQuestIds = (active ?? []).map((x: any) => x.side_quest_id);

  const excludeIds = Array.from(new Set([...usedQuestIds, ...activeQuestIds]));

  let query = supabase.from("side_quests").select("id, prompt, points");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data: available } = await query;

  return available ?? [];
}

// ---- GET: Load or auto-assign a side quest ----
export async function GET(req: Request) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  // Existing active assignment?
  const { data: existing } = await supabase
    .from("player_side_quests")
    .select(`
      id,
      assigned_at,
      side_quests ( id, prompt, points )
    `)
    .eq("player_id", playerId)
    .eq("active", true)
    .maybeSingle();

  if (existing?.side_quests) {
    const quest = unwrapRelation(existing.side_quests);

    return NextResponse.json({
      sideQuest: {
        id: quest.id,
        prompt: quest.prompt,
        points: quest.points,
        assignedAt: existing.assigned_at,
      },
    });
  }

  // No active quest → assign a new one
  const available = await getAvailableQuests(supabase, playerId);

  if (available.length === 0) {
    return NextResponse.json({ sideQuest: null });
  }

  const quest = available[Math.floor(Math.random() * available.length)];

  const { data: inserted } = await supabase
    .from("player_side_quests")
    .insert({ player_id: playerId, side_quest_id: quest.id })
    .select("assigned_at")
    .single();

  return NextResponse.json({
    sideQuest: {
      id: quest.id,
      prompt: quest.prompt,
      points: quest.points,
      assignedAt: inserted!.assigned_at,
    },
  });
}

// ---- POST: Player can only SWITCH quests ----
export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const body = await req.json();
  const { playerId, action } = body;

  if (!playerId || action !== "switch") {
    return NextResponse.json(
      { error: "Players may only switch a side quest." },
      { status: 400 }
    );
  }

  // Load the active quest for this player
  const { data: active } = await supabase
    .from("player_side_quests")
    .select(`
      id,
      assigned_at,
      side_quests ( id, prompt, points )
    `)
    .eq("player_id", playerId)
    .eq("active", true)
    .maybeSingle();

  if (!active || !active.side_quests) {
    return NextResponse.json({ error: "No active quest to switch." }, { status: 400 });
  }

  const currentQuest = unwrapRelation(active.side_quests);

  // Check cooldown
  const elapsed = minutesSince(active.assigned_at);
  if (elapsed < SWITCH_COOLDOWN_MINUTES) {
    return NextResponse.json(
      {
        error: `You may switch in ${Math.ceil(
          SWITCH_COOLDOWN_MINUTES - elapsed
        )} minutes.`,
      },
      { status: 400 }
    );
  }

  // Mark old quest inactive
  await supabase
    .from("player_side_quests")
    .update({ active: false })
    .eq("id", active.id);

  // Assign a new quest
  const available = await getAvailableQuests(supabase, playerId);

  if (available.length === 0) {
    return NextResponse.json({ sideQuest: null });
  }

  const newQuest = available[Math.floor(Math.random() * available.length)];

  const { data: inserted } = await supabase
    .from("player_side_quests")
    .insert({ player_id: playerId, side_quest_id: newQuest.id })
    .select("assigned_at")
    .single();

  return NextResponse.json({
    sideQuest: {
      id: newQuest.id,
      prompt: newQuest.prompt,
      points: newQuest.points,
      assignedAt: inserted!.assigned_at,
    },
  });
}
