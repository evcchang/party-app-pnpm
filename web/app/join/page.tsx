"use client";

import { useState } from "react";
import { TEAMS } from "../constants/teams";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [team, setTeam] = useState(TEAMS[0].name);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, team }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    window.location.href = `/player/${data.playerId}`;
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Join the Game</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600">{error}</p>}

        {/* NAME INPUT */}
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
          required
        />

        {/* TEAM DROPDOWN */}
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="border p-2 w-full"
        >
          {TEAMS.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Joining…" : "Join"}
        </button>
      </form>
    </main>
  );
}
