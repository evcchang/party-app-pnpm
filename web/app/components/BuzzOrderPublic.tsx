"use client";

import { TEAMS } from "../constants/teams";

type Buzz = {
  id: string;
  player_id: string;
  player_name: string;
  team: string;
  question_id: string;
  created_at: string;
};

export default function BuzzOrderPublic({ buzzes }: { buzzes: Buzz[] }) {
  // Convert TEAMS array → map for easy lookup
  const teamColorMap = Object.fromEntries(
    TEAMS.map((t) => [t.name, t.color])
  );

  return (
    <div className="p-4 border rounded bg-gray-900 text-white max-h-[400px] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2">Buzz Order</h2>

      {buzzes.length === 0 ? (
        <p className="text-gray-400 text-sm">No buzzes yet...</p>
      ) : (
        <ol className="list-decimal list-inside space-y-1">
          {buzzes.map((b) => {
            const color = teamColorMap[b.team] || "#666"; // fallback

            return (
              <li
                key={b.id}
                className="flex items-center justify-between rounded px-2 py-1 text-sm"
                style={{
                  background: `${color}22`, // subtle tinted background
                  borderLeft: `6px solid ${color}`, // solid stripe
                }}
              >
                <span className="font-semibold">{b.player_name}</span>
                <span className="text-xs opacity-80">({b.team})</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
