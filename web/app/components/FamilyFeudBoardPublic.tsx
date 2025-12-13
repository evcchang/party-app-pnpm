"use client";

import { FeudRound, FeudAnswer } from "@/app/types/familyFeud";

interface Props {
  round: FeudRound | null;
  answers: FeudAnswer[];
}

export default function FamilyFeudBoardPublic({ round, answers }: Props) {
  if (!round) {
    return (
      <section className="p-6 text-center text-gray-500">
        Family Feud is active… waiting for the host to start a round.
      </section>
    );
  }

  return (
    <section className="space-y-6">

      {/* QUESTION */}
      <h2 className="text-3xl font-bold text-center">
        {round.question}
      </h2>

      {/* ANSWERS */}
      <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto">
        {answers.map((ans) => (
          <div
            key={ans.id}
            className="bg-blue-900 text-white p-4 rounded text-xl flex justify-between"
          >
            {ans.revealed ? (
              <>
                <span>{ans.answer}</span>
                <span>{ans.points}</span>
              </>
            ) : (
              <span>●●●●●</span>
            )}
          </div>
        ))}
      </div>

      {/* STRIKES */}
      <div className="flex justify-center space-x-4 mt-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`w-12 h-12 flex items-center justify-center text-3xl font-bold border rounded ${
              round.strikes >= n ? "bg-red-600 text-white" : "bg-gray-200"
            }`}
          >
            X
          </div>
        ))}
      </div>
    </section>
  );
}
