import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Flame, Timer, Plus } from "lucide-react";
import { type Streak } from "@/lib/api";
import { CountdownTimer } from "./CountdownTimer";
import { motion } from "framer-motion";

interface DailyProgressProps {
  streaks: Streak[];
  onCreateClick: () => void;
}

function isWindowCompleted(streak: Streak): boolean {
  if (!streak.lastActivityAt || !streak.deadline) return false;
  const lastActivity = new Date(streak.lastActivityAt);
  const now = new Date();
  return (
    lastActivity.toISOString().split("T")[0] === now.toISOString().split("T")[0]
  );
}

export function DailyProgress({ streaks, onCreateClick }: DailyProgressProps) {
  const activeStreaks = streaks.filter((s) => s.status === "active");
  const completedStreaks = activeStreaks.filter(isWindowCompleted);
  const incompleteStreaks = activeStreaks.filter((s) => !isWindowCompleted(s));

  const isAllComplete =
    activeStreaks.length > 0 && incompleteStreaks.length === 0;
  const hasNoStreaks = activeStreaks.length === 0;

  const nextDeadline =
    incompleteStreaks.length > 0
      ? incompleteStreaks.sort(
          (a, b) =>
            new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime(),
        )[0].deadline
      : null;

  return (
    <div className="w-full bg-surface border border-outline rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {hasNoStreaks
              ? "Start your journey"
              : isAllComplete
                ? "You're all set for today!"
                : "Keep the momentum going"}
          </h2>
          <p className="text-muted text-lg">
            {hasNoStreaks
              ? "Create a streak to build unbreakable consistency."
              : isAllComplete
                ? `You've maintained ${activeStreaks.length} streak${activeStreaks.length === 1 ? "" : "s"} today. Great work!`
                : `${completedStreaks.length}/${activeStreaks.length} streaks completed today.`}
          </p>

          <div className="flex items-center gap-4 mt-6">
            {!hasNoStreaks && (
              <Link to="/dashboard/streaks">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-brand-900/20 cursor-pointer"
                >
                  View All Streaks
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCreateClick}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer ${
                hasNoStreaks
                  ? "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20"
                  : "bg-brand-400/10 hover:bg-brand-400/30 text-foreground border border-brand-400/30"
              }`}
            >
              {hasNoStreaks ? "Create First Streak" : "Create Streak"}
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Status Indicator / Timer */}
        <div className="shrink-0">
          {hasNoStreaks ? (
            <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center">
              <Flame className="w-8 h-8 text-brand-500" />
            </div>
          ) : isAllComplete ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center w-32 h-32 sm:w-40 sm:h-40 bg-status-gentle/10 rounded-full border-4 border-status-gentle/20"
            >
              <CheckCircle2 className="w-12 h-12 text-status-gentle mb-1" />
              <span className="text-sm font-semibold text-status-gentle">
                Complete
              </span>
            </motion.div>
          ) : (
            nextDeadline && (
              <div className="flex flex-col items-center justify-center p-6 bg-surface border border-outline rounded-2xl md:min-w-[200px]">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Timer className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Next Deadline
                  </span>
                </div>
                <div className="text-3xl font-mono font-bold text-foreground">
                  <CountdownTimer deadline={nextDeadline} />
                </div>
                <p className="text-xs text-muted mt-2 text-center">
                  {incompleteStreaks.length} remaining
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
