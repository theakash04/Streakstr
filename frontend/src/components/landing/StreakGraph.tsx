import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Simple seeded PRNG (mulberry32) so each mount gets
 * a unique but deterministic pattern.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEEKS = 20;
const DAYS = 7;

const getColor = (level: number) => {
  switch (level) {
    case 4:
      return "bg-brand-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]";
    case 3:
      return "bg-brand-600";
    case 2:
      return "bg-brand-800";
    case 1:
      return "bg-brand-900/50";
    default:
      return "bg-surface/50";
  }
};

const StreakGraph: React.FC = () => {
  const { grid, delays } = useMemo(() => {
    const rand = mulberry32(Date.now());
    const g: number[][] = [];
    const d: number[][] = [];

    // Pick a random pattern style
    const pattern = Math.floor(rand() * 5);

    for (let w = 0; w < WEEKS; w++) {
      const week: number[] = [];
      const weekDelays: number[] = [];

      for (let day = 0; day < DAYS; day++) {
        let level: number;

        switch (pattern) {
          case 0: {
            // "Building momentum" — activity ramps up over weeks
            const progress = w / WEEKS;
            const bias = progress * 3;
            level = Math.min(4, Math.floor(rand() * (bias + 1)));
            // Occasional rest days
            if (rand() < 0.15) level = 0;
            break;
          }
          case 1: {
            // "Weekday warrior" — active on weekdays, rest on weekends
            if (day >= 5) {
              level = rand() < 0.3 ? 1 : 0;
            } else {
              level = Math.min(4, Math.floor(rand() * 4) + 1);
            }
            // Some weeks off entirely
            if (rand() < 0.08) level = 0;
            break;
          }
          case 2: {
            // "Streak bursts" — clusters of high activity with gaps
            const inBurst = Math.sin(w * 0.8 + rand() * 2) > -0.2;
            if (inBurst) {
              level = Math.min(4, Math.floor(rand() * 3) + 2);
            } else {
              level = rand() < 0.2 ? 1 : 0;
            }
            break;
          }
          case 3: {
            // "Diagonal wave" — activity flows diagonally
            const wave = Math.sin((w + day) * 0.5) * 0.5 + 0.5;
            level = Math.min(4, Math.floor(wave * 4 + rand() * 1.5));
            if (rand() < 0.1) level = 0;
            break;
          }
          default: {
            // "Consistent grinder" — mostly active with occasional dips
            const base = Math.floor(rand() * 3) + 2;
            level = rand() < 0.2 ? Math.floor(rand() * 2) : base;
            break;
          }
        }

        // Last few weeks always have strong activity (current streak)
        if (w > WEEKS - 4) level = Math.max(2, level);
        // Future days in the last week are empty
        if (w === WEEKS - 1 && day > 3) level = 0;

        week.push(level);
        weekDelays.push(rand() * 1.5);
      }

      g.push(week);
      d.push(weekDelays);
    }

    return { grid: g, delays: d };
  }, []);

  return (
    <div className="relative glass-panel p-4 rounded-xl border border-outline max-w-2xl mx-auto overflow-hidden">
      <div className="flex gap-1.5 justify-center relative z-10 overflow-x-auto pb-2 scrollbar-hide">
        {grid.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-1.5">
            {week.map((level, dIndex) => (
              <motion.div
                key={`${wIndex}-${dIndex}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: delays[wIndex][dIndex],
                  duration: 0.3,
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                }}
                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm ${getColor(level)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-3 text-xs text-subtle px-2 font-mono">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-surface/50" />
          <div className="w-3 h-3 rounded-sm bg-brand-900/50" />
          <div className="w-3 h-3 rounded-sm bg-brand-800" />
          <div className="w-3 h-3 rounded-sm bg-brand-600" />
          <div className="w-3 h-3 rounded-sm bg-brand-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

export default StreakGraph;
