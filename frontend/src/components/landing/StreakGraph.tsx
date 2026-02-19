import React from "react";
import { motion } from "framer-motion";

const StreakGraph: React.FC = () => {
  // Generate some dummy data
  const weeks = 20;
  const days = 7;

  const getRandomLevel = () => {
    const rand = Math.random();
    if (rand > 0.8) return 4; // High activity
    if (rand > 0.6) return 3;
    if (rand > 0.4) return 2;
    if (rand > 0.2) return 1;
    return 0; // No activity
  };

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

  return (
    <div className="relative glass-panel p-4 rounded-xl border border-outline max-w-2xl mx-auto overflow-hidden">
      <div className="flex gap-1.5 justify-center relative z-10 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: weeks }).map((_, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-1.5">
            {Array.from({ length: days }).map((_, dIndex) => {
              // Simulate a "current streak" at the end
              let level = getRandomLevel();
              if (wIndex > weeks - 4) level = Math.max(2, level); // Recent activity is high
              if (wIndex === weeks - 1 && dIndex > 3) level = 0; // Future days empty

              const randomDelay = Math.random() * 1.5;

              return (
                <motion.div
                  key={`${wIndex}-${dIndex}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: randomDelay,
                    duration: 0.3,
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                  className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm ${getColor(level)}`}
                />
              );
            })}
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
