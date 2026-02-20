import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { type Streak } from "@/lib/api";
import { StreakCard } from "./StreakCard";

interface StreakFolderProps {
  streaks: Streak[];
}

export function StreakFolder({ streaks }: StreakFolderProps) {
  // Prioritize active solo streaks, then any active streak, then any streak
  const activeSolo = streaks.find(
    (s) => s.type === "solo" && s.status === "active",
  );
  const topStreak =
    activeSolo || streaks.find((s) => s.status === "active") || streaks[0];

  const totalStreaks = streaks.length;

  if (!topStreak) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Your Streaks
          </h2>
        </div>
        <Link
          to="/dashboard/streaks"
          className="text-sm text-brand-500 hover:text-brand-400 font-medium flex items-center gap-1 transition-colors"
        >
          View all ({totalStreaks})
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="relative group">
        {/* Background stack effect */}
        {totalStreaks > 1 && (
          <div className="absolute top-2 left-0 w-full h-full bg-surface border border-outline/60 rounded-2xl transform scale-[0.96] translate-y-1 transition-transform group-hover:translate-y-2 -z-10" />
        )}
        {totalStreaks > 2 && (
          <div className="absolute top-4 left-0 w-full h-full bg-surface border border-outline/40 rounded-2xl transform scale-[0.92] translate-y-2 transition-transform group-hover:translate-y-4 -z-20" />
        )}

        {/* Main Card */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <StreakCard streak={topStreak} />
        </motion.div>

        {/* Overlay Action (optional, clicking card already goes to details) */}
        {/* Users might expect clicking the "folder" to go to the list if they click the edges, 
            but StreakCard covers the whole area. 
            We'll rely on the "View all" link for list navigation 
            and the card itself for specific streak details. 
        */}
      </div>
    </div>
  );
}
