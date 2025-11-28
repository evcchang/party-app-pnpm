'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    window.location.href = '/admin/dashboard';
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
      <input className="w-full p-2 border rounded mb-3" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="w-full p-2 border rounded mb-3" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button className="w-full bg-green-600 text-white p-2 rounded" onClick={login}>Login</button>
    </main>
  );
}
