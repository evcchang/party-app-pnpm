// web/app/api/points/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { playerId, supabaseAccessToken } = body;

    if (!playerId) return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    if (!supabaseAccessToken) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const supabase = createServerSupabase();

    // Get the logged-in user from the access token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(supabaseAccessToken);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // Check if the user is an admin
    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_uid', user.id)
      .single();

    if (!admin) return NextResponse.json({ error: 'Forbidden: not an admin' }, { status: 403 });

    // Get player info
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    // Call the RPC to add a point to the player & their team
    const { error: rpcError } = await supabase.rpc('add_point', {
      player_id: playerId,
      team_id: player.team_id,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error in /api/points:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
