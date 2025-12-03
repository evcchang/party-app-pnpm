"use client";

import React from "react";

export default function CampFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        min-h-screen
        w-full
        flex flex-col
        items-center
        bg-[#f2efe3]
        relative
      "
    >
{/* -------------------- DESKTOP FRAME -------------------- */}
<div
  className="
    hidden md:flex
    fixed top-0 inset-x-0        /* ← span full width, no centering transform */
    pointer-events-none
    flex-row items-start
    w-full                       /* ← use full layout width, not 100vw */
    justify-center
    z-0
  "
>
  {/* LEFT pillar – on top, overlapping banner slightly */}
  <img
    src="/camp/LeftPillar.svg"
    alt="Left Pillar"
    className="
      h-screen
      mr-[-170px]
      z-10
    "
  />

  {/* FULL-WIDTH BANNER – behind pillars */}
  <img
    src="/camp/TopBanner.svg"
    alt="Camp Banner"
    className="
      h-[160px]
      w-full                  /* ← matches the actual page width */
      object-cover
      z-0
    "
  />

  {/* RIGHT pillar – on top, overlapping banner slightly */}
  <img
    src="/camp/RightPillar.svg"
    alt="Right Pillar"
    className="
      h-screen
      ml-[-170px]
      z-10
    "
  />
</div>


      {/* -------------------- MOBILE BANNER ONLY -------------------- */}
      <div
        className="
          block md:hidden
          fixed top-0 left-1/2 -translate-x-1/2
          z-0 pointer-events-none
          flex justify-center
          w-full
        "
      >
        <img
          src="/camp/TopBanner.svg"
          alt="Camp Banner"
          className="w-[90%] max-w-[420px]"
          style={{ height: "160px" }}
        />
      </div>

      {/* -------------------- MAIN CONTENT (NARROWER THAN FRAME) -------------------- */}
      <main
        className="
          relative z-10
          w-full
          max-w-6xl        /* ← Children width remains as before */
          px-4 md:px-6
          pt-[180px] md:pt-40
          pb-8
        "
      >
        {children}
      </main>
    </div>
  );
}
