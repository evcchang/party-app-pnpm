'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('teams').select('*').order('name');
      setTeams(data || []);
    }
    load();

    const channel = supabase.channel('teams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, payload => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Live Scoreboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {teams.map(t => (
          <div key={t.id} className="bg-white p-4 rounded shadow">
            <div className="text-lg font-semibold">{t.name}</div>
            <div className="text-4xl mt-2">{t.score}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
