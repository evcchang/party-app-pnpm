'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function Dashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: p } = await supabase.from('players').select('id,name,team_id,total_points');
    const { data: t } = await supabase.from('teams').select('*').order('name');
    setPlayers(p || []);
    setTeams(t || []);
  }

  async function addPoint(playerId: string) {
    // Get session properly
    const { data, error } = await supabase.auth.getSession();
  
    if (error) {
      console.error('Error getting session:', error);
      return;
    }
  
    const session = data.session;
    if (!session) {
      alert('Not logged in');
      return;
    }
  
    const accessToken = session.access_token;
  
    await fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, supabaseAccessToken: accessToken }),
    });
  
    // Refresh data / scoreboard
    load();
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      <div className="space-y-3">
        {players.map(p => (
          <div key={p.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
            <div>
              <div className="font-bold">{p.name}</div>
              <div className="text-sm text-gray-500">Team: {teams.find(t=>t.id===p.team_id)?.name || '—'}</div>
            </div>
            <div className="flex gap-2">
              <div className="text-xl">{p.total_points}</div>
              <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => addPoint(p.id)}>+1</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
