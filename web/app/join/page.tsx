'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function JoinPage() {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    async function loadTeams() {
      const { data } = await supabase.from('teams').select('*').order('name');
      setTeams(data || []);
    }
    loadTeams();
  }, []);

  async function submit() {
    if (!name || !teamId) return alert('name and team required');
    await supabase.from('players').insert([{ name, team_id: teamId }]);
    window.location.href = '/';
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Join the Game</h1>
      <input className="w-full p-2 border rounded mb-3" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      <select className="w-full p-2 border rounded mb-3" value={teamId} onChange={e => setTeamId(e.target.value)}>
        <option value=''>Select team</option>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button className="w-full bg-blue-600 text-white p-2 rounded" onClick={submit}>Join</button>
    </main>
  );
}
