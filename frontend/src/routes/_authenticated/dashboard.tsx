import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useStreaksQuery } from "@/hooks/useStreaks";
import {
  Activity,
  Flame,
  Plus,
  Settings2,
  Share2,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/Button";
import { useState } from "react";
import { Calendar } from "@/components/Calender";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const { isLoading, data: streaks = [] } = useStreaksQuery();
  const [activeStreakId, setActiveStreakId] = useState<string>("");

  const activeStreak =
    streaks.find((s) => s.id === activeStreakId) || streaks[0] || null;
  const lastActiveHours = activeStreak?.lastActivityAt
    ? Math.floor(
        (Date.now() - new Date(activeStreak.lastActivityAt).getTime()) /
          (1000 * 60 * 60),
      )
    : null;

  const navigate = useNavigate();
  if (streaks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-3xl animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-text-muted" />
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1">
          Your dashboard is empty
        </h3>
        <p className="text-text-secondary text-sm max-w-xs text-center mb-6">
          Time to commit. Create a streak and we'll start tracking.
        </p>
        <Button onClick={() => navigate({ to: "/new" })}>Create Streak</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Tabs for fast switching */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 custom-scrollbar">
        {streaks.map((streak) => (
          <button
            key={streak.id}
            onClick={() => setActiveStreakId(streak.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeStreakId === streak.id
                ? "bg-text-primary text-background shadow-md"
                : "bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
          >
            {streak.type === "solo" ? (
              <Flame className="w-3.5 h-3.5" />
            ) : (
              <Users className="w-3.5 h-3.5" />
            )}
            {streak.name}
          </button>
        ))}
        <button
          onClick={() => navigate({ to: "/new" })}
          className="p-2 rounded-full bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
          title="Add New"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Detailed View Card */}
      <div className="bg-surface border border-border rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          {activeStreak.type === "solo" ? (
            <Flame className="w-64 h-64 text-text-primary" />
          ) : (
            <Users className="w-64 h-64 text-text-primary" />
          )}
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
                  {activeStreak.name}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    activeStreak.type === "solo"
                      ? "bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/10 dark:border-orange-900/30 dark:text-orange-400"
                      : "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-900/10 dark:border-indigo-900/30 dark:text-indigo-400"
                  }`}
                >
                  {activeStreak.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  Last Active: {lastActiveHours ?? "—"}
                  {lastActiveHours !== null ? " h ago" : ""}
                </span>
                {activeStreak.type === "duo" && activeStreak.user2Pubkey && (
                  <span
                    className="flex items-center gap-1.5"
                    title={activeStreak.user2Pubkey}
                  >
                    <Share2 className="w-4 h-4" />
                    With Partner
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right mr-2">
                <p className="text-4xl font-bold text-text-primary">
                  {activeStreak.currentCount}
                </p>
                <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">
                  Day Streak
                </p>
              </div>
              <div className="h-12 w-px bg-border mx-2 hidden md:block"></div>
              <Button
                variant="secondary"
                // onClick={() => setEditingStreak(activeStreak)} TODO: Implement settings modal
                className="gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Manage Settings
              </Button>
            </div>
          </div>

          {/* Main Calendar Area */}
          <div className="bg-background/50 rounded-2xl p-6 border border-border mb-8">
            <Calendar history={activeStreak.history} />
          </div>

          {/* Quick Settings Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-surface-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-text-primary">
                  Reminder Settings
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                Receive DMs if inactivity is detected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
