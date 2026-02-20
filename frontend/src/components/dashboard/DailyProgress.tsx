import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Timer,
  Plus,
  CircleDashed,
} from "lucide-react";
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

  // Determine the next deadline, prioritizing solo streaks if multiple exist
  let nextDeadline: string | null = null;
  if (incompleteStreaks.length > 0) {
    const sortedByDeadline = [...incompleteStreaks].sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime(),
    );

    // Try to find the earliest incomplete solo streak
    const earliestSolo = sortedByDeadline.find((s) => s.type === "solo");
    nextDeadline = earliestSolo
      ? earliestSolo.deadline
      : sortedByDeadline[0].deadline;
  }

  return (
    <div className="w-full bg-surface border border-outline rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div className="relative z-10 flex flex-col-reverse lg:flex-row lg:items-center justify-between gap-8 lg:gap-6">
        <div className="w-full lg:w-3/5">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 text-center lg:text-left">
            {hasNoStreaks
              ? "Start your journey"
              : isAllComplete
                ? "You're all set for today!"
                : "Keep the momentum going"}
          </h2>
          <p className="text-muted text-lg mb-6 text-center lg:text-left">
            {hasNoStreaks
              ? "Create a streak to build unbreakable consistency."
              : isAllComplete
                ? `You've maintained ${activeStreaks.length} streak${activeStreaks.length === 1 ? "" : "s"} today. Great work!`
                : `${completedStreaks.length}/${activeStreaks.length} streaks completed today.`}
          </p>

          {/* Streak Status Badges */}
          {!hasNoStreaks && (
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8">
              {activeStreaks.map((streak) => {
                const isCompleted = isWindowCompleted(streak);
                return (
                  <Link
                    key={streak.id}
                    to="/dashboard/$streakId"
                    params={{ streakId: streak.id }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isCompleted
                        ? "bg-status-gentle/10 border-status-gentle/20 text-status-gentle hover:bg-status-gentle/20"
                        : "bg-surface border-outline text-muted hover:text-foreground hover:bg-outline"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <CircleDashed className="w-3.5 h-3.5" />
                    )}
                    <span className="truncate max-w-[120px]">
                      {streak.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            {!hasNoStreaks && (
              <Link to="/dashboard/streaks" className="w-full sm:w-max">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-full sm:w-auto gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-brand-900/20 cursor-pointer"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCreateClick}
              className={`flex items-center justify-center w-full sm:w-auto gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors cursor-pointer ${
                hasNoStreaks
                  ? "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/20"
                  : "bg-brand-400/10 hover:bg-brand-400/30 text-foreground border border-brand-400/30"
              }`}
            >
              {hasNoStreaks ? "Create First Streak" : "Create"}
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Status Indicator / Timer */}
        <div className="w-full lg:w-2/5 flex justify-center lg:justify-end bg-transparent rounded-3xl p-2 backdrop-blur-sm">
          {hasNoStreaks ? (
            <div className="w-48 h-48 lg:w-40 lg:h-40 bg-brand-500/10 rounded-full flex items-center justify-center border-4 border-surface shadow-[0_0_20px_rgba(var(--color-brand-500),0.1)]">
              <Flame className="w-20 h-20 text-brand-500 opacity-80" />
            </div>
          ) : isAllComplete ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center w-48 h-48 lg:w-40 lg:h-40 bg-status-gentle/10 rounded-full border-4 border-status-gentle/20 shadow-[0_0_20px_rgba(var(--color-status-gentle),0.1)]"
            >
              <CheckCircle2 className="w-16 h-16 lg:w-12 lg:h-12 text-status-gentle mb-2" />
              <span className="text-sm font-semibold text-status-gentle">
                Complete
              </span>
            </motion.div>
          ) : (
            nextDeadline && (
              <div className="flex flex-col items-center justify-center w-full max-w-[280px] lg:w-48 py-8 lg:py-0 lg:h-48 bg-surface/50 border border-brand-500/20 rounded-4xl shadow-[0_0_30px_rgba(var(--color-brand-500),0.05)] relative overflow-hidden group-hover:border-brand-500/40 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-b from-brand-500/5 to-transparent opacity-50" />
                <div className="relative z-10 flex items-center gap-2 text-brand-400 mb-4">
                  <Timer className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Next Deadline
                  </span>
                </div>
                <div className="relative z-10 text-4xl lg:text-3xl font-mono font-black text-foreground drop-shadow-md tracking-tight">
                  <CountdownTimer deadline={nextDeadline} />
                </div>
                <div className="relative z-10 w-full mt-5 pt-4 border-t border-brand-500/10 flex items-center justify-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                  <p className="text-xs font-medium text-muted">
                    {incompleteStreaks.length}{" "}
                    {incompleteStreaks.length === 1 ? "streak" : "streaks"}{" "}
                    remaining
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
