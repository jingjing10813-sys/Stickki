"use client";

import { CharacterGhost, LoadingText } from "./StickkiLogos";

export function LoadingScreen() {
  return (
    <main
      className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle, #f3f4f6 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
      }}
    >
      <CharacterGhost animated style={{ width: 57, height: 64, marginBottom: 8 }} />

      <LoadingText style={{ width: 155, height: 33 }} />
    </main>
  );
}
