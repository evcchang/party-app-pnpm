"use client";

import { ReactNode, useMemo } from "react";

type Props = {
  children: ReactNode;
  density?: number; // number of flakes
};

export default function SnowFrame({ children, density = 40 }: Props) {
  const flakes = useMemo(() => {
    return Array.from({ length: density }).map((_, i) => {
      const left = Math.random() * 100;
      const size = 6 + Math.random() * 18;
      const duration = 6 + Math.random() * 10;
      const delay = Math.random() * 6;
      const drift = (Math.random() * 2 - 1) * 40;

      return { i, left, size, duration, delay, drift };
    });
  }, [density]);

  return (
    <div className="min-h-screen bg-[#0b1020] text-white relative overflow-hidden">
      {/* Snow layer */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {flakes.map((f) => (
          <span
            key={f.i}
            className="snowflake"
            style={{
              left: `${f.left}vw`,
              fontSize: `${f.size}px`,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              // @ts-ignore
              ["--drift" as any]: `${f.drift}px`,
            }}
          >
            ❄
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>

      <style jsx>{`
        .snowflake {
          position: absolute;
          top: -10%;
          opacity: 0.85;
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.25));
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          user-select: none;
          will-change: transform, opacity;
        }

        @keyframes fall {
          0% {
            transform: translate3d(0, -10vh, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          100% {
            transform: translate3d(var(--drift), 120vh, 0);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}
