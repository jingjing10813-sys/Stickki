"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ErrorGraphic, StickkiCharacterError } from "@/components/ui/StickkiLogos";

export default function NotFound() {
  return (
    <main
      className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle, #f3f4f6 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
      }}
    >
      <ErrorGraphic animated style={{ width: 198, height: 119, marginLeft: 46, marginBottom: 96 }} />

      <div className="relative" style={{ marginTop: 40 }}>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: -30, right: -10 }}
        >
          <StickkiCharacterError animated style={{ width: 35, height: 43 }} />
        </motion.div>
        <Link
          href="/"
          className="rounded-2xl font-semibold text-sm flex items-center justify-center"
          style={{ backgroundColor: "#27272A", color: "#F4F4F5", padding: "12px 16px" }}
        >
          집으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
