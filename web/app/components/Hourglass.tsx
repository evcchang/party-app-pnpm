"use client";

import { getTeamColor } from "../../lib/getTeamColor";

export default function Hourglass({
  team,
  points,
  maxPoints,
  isLeader,
}: {
  team: string;
  points: number;
  maxPoints: number;
  isLeader: boolean;
}) {
  const color = getTeamColor(team);
  const fillPercent = Math.min(points / maxPoints, 1);

  return (
    <div
      className={`flex flex-col items-center gap-2 w-40 ${
        isLeader ? "drop-shadow-[0_0_18px_gold] brightness-125" : ""
      }`}
    >
      <span className="font-semibold">{team}</span>

      <svg
        width="180"
        height="240"
        viewBox="0 0 235.319 260"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === ORIGINAL FRAME (unchanged) === */}
        <path
          d="m201.094,29.997c2.649-0.623 4.623-2.996 4.623-5.835v-18.162c0-3.313-2.687-6-6-6h-164.114c-3.313,0-6,2.687-6,6v18.163c0,2.839 1.974,5.212 4.623,5.835 1.812,32.314 18.594,61.928 45.682,80.076l11.324,7.586-11.324,7.586c-27.089,18.147-43.871,47.762-45.682,80.076-2.649,0.623-4.623,2.996-4.623,5.835v18.163c0,3.313 2.687,6 6,6h164.114c3.313,0 6-2.687 6-6v-18.163c0-2.839-1.974-5.212-4.623-5.835-1.812-32.314-18.594-61.928-45.683-80.076l-11.324-7.586 11.324-7.586c27.089-18.148 43.871-47.763 45.683-80.077z"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinejoin="round"
        />

        {/* === TOP SAND (unchanged) === */}
        <path
          d="m133.307,82.66h-31.295c-2.487,0-4.717,1.535-5.605,3.858-0.888,2.324-0.25,4.955 1.604,6.613l15.647,14c1.139,1.019 2.57,1.528 4,1.528s2.862-0.509 4-1.528l15.647-14c1.854-1.659 2.492-4.29 1.604-6.613-0.885-2.323-3.115-3.858-5.602-3.858z"
          fill={color}
          opacity="0.50"
        />

        {/*
          === NEW ELONGATED BOTTOM BULB ===
          - Deeper
          - Wider
          - More visually substantial
        */}
        <clipPath id={`elongated-bottom-${team}`}>
          <ellipse cx="117" cy="200" rx="65" ry="45" />
        </clipPath>

        {/* === BOTTOM SAND FILL === */}
        <rect
          x="52"
          y={200 - fillPercent * 90}
          width="130"
          height={fillPercent * 90}
          fill={color}
          opacity="0.85"
          clipPath={`url(#elongated-bottom-${team})`}
          style={{ transition: "all 0.5s ease-out" }}
        />
      </svg>

      <span className="text-xl font-bold">{points}</span>
    </div>
  );
}
