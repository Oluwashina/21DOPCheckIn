"use client";

import { motion } from "framer-motion";

const PIECES = Array.from({ length: 14 }, (_, index) => index);
const COLORS = ["#ffc62b", "#ffd96b", "#b06bff", "#ff4d6d", "#f8f5fb"];

/** Small confetti burst used when a check-in is submitted. */
export function Celebration() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {PIECES.map((index) => {
        const angle = (index / PIECES.length) * Math.PI * 2;
        const distance = 90 + (index % 4) * 26;
        return (
          <motion.span
            key={index}
            className="absolute h-2 w-2 rounded-[2px]"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 40,
              scale: 1,
              rotate: index % 2 === 0 ? 180 : -180,
            }}
            transition={{ duration: 1.1, ease: "easeOut", delay: (index % 5) * 0.03 }}
          />
        );
      })}
    </div>
  );
}
