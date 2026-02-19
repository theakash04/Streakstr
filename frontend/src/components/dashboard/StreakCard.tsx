import { Link } from "@tanstack/react-router";
import { Flame, Clock, ArrowRight, Check } from "lucide-react";
import { type Streak } from "@/lib/api";
import { CountdownTimer } from "./CountdownTimer";

interface StreakCardProps {
  streak: Streak;
}

function isWindowCompleted(streak: Streak): boolean {
  if (!streak.lastActivityAt || !streak.deadline) return false;
  const lastActivity = new Date(streak.lastActivityAt);
  const now = new Date();
  return (
    lastActivity.toISOString().split("T")[0] === now.toISOString().split("T")[0]
  );
}

export function StreakCard({ streak }: StreakCardProps) {
  const completed = isWindowCompleted(streak);
  const statusStyles: Record<string, { dot: string; badge: string }> = {
    active: {
      dot: "bg-status-gentle",
      badge: "bg-status-gentle/10 text-status-gentle border-status-gentle/20",
    },
    pending: {
      dot: "bg-status-firm",
      badge: "bg-status-firm/10 text-status-firm border-status-firm/20",
    },
    broken: {
      dot: "bg-status-chaos",
      badge: "bg-status-chaos/10 text-status-chaos border-status-chaos/20",
    },
  };

  const style = statusStyles[streak.status] || statusStyles.pending;

  return (
    <Link
      to="/dashboard/$streakId"
      params={{ streakId: streak.id }}
      className="block group"
    >
      <div className="bg-surface border border-outline rounded-2xl p-5 hover:border-brand-500/30 transition-all duration-300 h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
              <Flame className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-brand-400 transition-colors">
                {streak.name}
              </h3>
              <span className="text-[10px] text-muted capitalize">
                {streak.type}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}
          >
            {streak.status}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {streak.currentCount}
            </p>
            <p className="text-[10px] text-muted">
              Best: {streak.highestCount}
            </p>
          </div>

          {/* Timer or arrow */}
          <div className="text-right">
            {streak.deadline && streak.status === "active" ? (
              <div className="flex items-center gap-1.5 text-muted">
                {completed ? (
                  <Check className="w-3 h-3 text-status-gentle" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                <CountdownTimer
                  deadline={streak.deadline}
                  compact
                  completed={completed}
                />
              </div>
            ) : (
              <ArrowRight className="w-4 h-4 text-muted group-hover:text-brand-500 transition-colors" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
