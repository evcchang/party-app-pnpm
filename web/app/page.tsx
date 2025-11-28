"use client";

import Scoreboard from "./components/Scoreboard";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Party Scoreboard</h1>
        <Link
          href="/join"
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          Join the Game
        </Link>
      </header>

      {/* Our shared component */}
      <Scoreboard />

      <div className="mt-8 text-right">
        <Link href="/admin/login" className="text-xs text-gray-400 hover:text-gray-600">
          Admin login
        </Link>
      </div>
    </main>
  );
}
